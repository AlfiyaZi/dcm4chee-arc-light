/*
 * *** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is part of dcm4che, an implementation of DICOM(TM) in
 * Java(TM), hosted at https://github.com/gunterze/dcm4che.
 *
 * The Initial Developer of the Original Code is
 * J4Care.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * See @authors listed below
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * *** END LICENSE BLOCK *****
 */

package org.dcm4chee.arc.ian.scu.impl;

import org.dcm4che3.data.*;
import org.dcm4che3.net.ApplicationEntity;
import org.dcm4che3.net.Device;
import org.dcm4chee.arc.Scheduler;
import org.dcm4chee.arc.conf.ArchiveAEExtension;
import org.dcm4chee.arc.conf.ArchiveDeviceExtension;
import org.dcm4chee.arc.conf.Duration;
import org.dcm4chee.arc.entity.IanTask;
import org.dcm4chee.arc.entity.MPPS;
import org.dcm4chee.arc.mpps.MPPSContext;
import org.dcm4chee.arc.query.QueryService;
import org.dcm4chee.arc.store.StoreContext;
import org.dcm4chee.arc.store.StoreSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;
import javax.inject.Inject;
import java.util.List;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since Apr 2016
 */
@ApplicationScoped
public class IANScheduler extends Scheduler {
    private static final Logger LOG = LoggerFactory.getLogger(IANScheduler.class);

    @Inject
    private Device device;

    @Inject
    private IANEJB ejb;

    @Inject
    private QueryService queryService;

    @Override
    protected Logger log() {
        return LOG;
    }

    @Override
    protected Duration getPollingInterval() {
        ArchiveDeviceExtension arcDev = device.getDeviceExtension(ArchiveDeviceExtension.class);
        return arcDev.getIanTaskPollingInterval();
    }

    @Override
    protected void execute() {
        ArchiveDeviceExtension arcDev = device.getDeviceExtension(ArchiveDeviceExtension.class);
        int fetchSize = arcDev.getIanTaskFetchSize();
        long ianTaskPk = 0;
        List<IanTask> ianTasks;
        do {
            ianTasks = ejb.fetchIANTasksForMPPS(device.getDeviceName(), ianTaskPk, fetchSize);
            for (IanTask ianTask : ianTasks) {
                ianTaskPk = ianTask.getPk();
                ApplicationEntity ae = device.getApplicationEntity(ianTask.getCallingAET(), true);
                Attributes ian = createIANForMPPS(ae, ianTask.getMpps());
                if (ian != null)
                    ejb.scheduleIANTask(ianTask, ian);
            }
        } while (ianTasks.size() == fetchSize);
        do {
            ianTasks = ejb.fetchIANTasksForStudy(device.getDeviceName(), fetchSize);
            for (IanTask ianTask : ianTasks) {
                ApplicationEntity ae = device.getApplicationEntity(ianTask.getCallingAET(), true);
                if (ianTask.getMpps() == null)
                    ejb.scheduleIANTask(ianTask, createIANForStudy(ae, ianTask.getStudyInstanceUID()));
                if (ae.getAEExtension(ArchiveAEExtension.class).ianOnTimeout())
                    ejb.scheduleIANTask(ianTask, createIANForStudy(ae, ianTask.getMpps().getStudyInstanceUID()));
                else
                    ejb.removeIANTask(ianTask);
            }
        } while (ianTasks.size() == fetchSize);
    }

    void onMPPSReceive(@Observes MPPSContext ctx) {
        MPPS mpps = ctx.getMPPS();
        if (mpps.getStatus() == MPPS.Status.COMPLETED) {
            ApplicationEntity ae = ctx.getLocalApplicationEntity();
            ArchiveAEExtension arcAE = ctx.getArchiveAEExtension();
            String[] ianDestinations = arcAE.ianDestinations();
            if (ianDestinations.length != 0 && arcAE.ianDelay() == null)
                ejb.createIANTaskForMPPS(arcAE, ctx.getCalledAET(), mpps);
        }
    }

    public void onStore(@Observes StoreContext ctx) {
        if (ctx.getLocation() == null)
            return;

        StoreSession session = ctx.getStoreSession();
        ArchiveAEExtension arcAE = session.getArchiveAEExtension();
        String[] ianDestinations = arcAE.ianDestinations();
        Duration ianDelay = arcAE.ianDelay();
        if (ianDestinations.length != 0 && ianDelay != null)
            ejb.createOrUpdateIANTaskForStudy(arcAE, session.getCalledAET(), ctx.getStudyInstanceUID());
    }

    private Attributes createIANForMPPS(ApplicationEntity ae, MPPS mpps) {
        Attributes mppsAttrs = mpps.getAttributes();
        String studyInstanceUID = mpps.getStudyInstanceUID();
        Sequence perfSeriesSeq = mppsAttrs.getSequence(Tag.PerformedSeriesSequence);
        Attributes ian = new Attributes(3);
        ian.newSequence(Tag.ReferencedPerformedProcedureStepSequence, 1).add(refMPPS(mpps));
        Sequence refSeriesSeq = ian.newSequence(Tag.ReferencedSeriesSequence, perfSeriesSeq.size());
        ian.setString(Tag.StudyInstanceUID, VR.UI, studyInstanceUID);
        for (Attributes perfSeries : perfSeriesSeq) {
            String seriesInstanceUID = perfSeries.getString(Tag.SeriesInstanceUID);
            Attributes result = queryService.getStudyAttributesWithSOPInstanceRefs(
                    studyInstanceUID, seriesInstanceUID, null, ae, true);
            if (result == null)
                return null;

            Attributes refStudy = result.getNestedDataset(Tag.CurrentRequestedProcedureEvidenceSequence);
            Attributes refSeries = refStudy.getSequence(Tag.ReferencedSeriesSequence).remove(0);
            Sequence available = refSeries.getSequence(Tag.ReferencedSOPSequence);
            if (!allAvailable(perfSeries.getSequence(Tag.ReferencedImageSequence), available) ||
                !allAvailable(perfSeries.getSequence(Tag.ReferencedNonImageCompositeSOPInstanceSequence), available))
                return null;

            refSeriesSeq.add(refSeries);
        }
        return ian;
    }

    private Attributes refMPPS(MPPS mpps) {
        Attributes refMPPS = new Attributes(3);
        refMPPS.setString(Tag.ReferencedSOPClassUID, VR.UI, UID.ModalityPerformedProcedureStepSOPClass);
        refMPPS.setString(Tag.ReferencedSOPInstanceUID, VR.UI, mpps.getSopInstanceUID());
        refMPPS.setNull(Tag.PerformedWorkitemCodeSequence, VR.SQ);
        return refMPPS;
    }

    private boolean allAvailable(Sequence performed, Sequence available) {
        if (performed != null)
            for (Attributes ref : performed) {
                if (!available(ref, available))
                    return false;
            }
        return true;
    }

    private boolean available(Attributes performed, Sequence available) {
        String iuid = performed.getString(Tag.ReferencedSOPInstanceUID);
        for (Attributes ref : available) {
            if (iuid.equals(ref.getString(Tag.ReferencedSOPInstanceUID)))
                return true;
        }
        return false;
    }

    private Attributes createIANForStudy(ApplicationEntity ae, String studyInstanceUID) {
        Attributes result = queryService.getStudyAttributesWithSOPInstanceRefs(studyInstanceUID, null, null, ae, true);
        Attributes refStudy = result.getNestedDataset(Tag.CurrentRequestedProcedureEvidenceSequence);
        refStudy.setNull(Tag.ReferencedPerformedProcedureStepSequence, VR.SQ);
        return refStudy;
    }

}