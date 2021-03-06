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

package org.dcm4chee.arc.query.scu.impl;

import org.dcm4che3.conf.api.IApplicationEntityCache;
import org.dcm4che3.data.*;
import org.dcm4che3.net.*;
import org.dcm4che3.net.pdu.AAssociateRQ;
import org.dcm4che3.net.pdu.PresentationContext;
import org.dcm4chee.arc.conf.ArchiveDeviceExtension;
import org.dcm4chee.arc.conf.Entity;
import org.dcm4chee.arc.query.scu.CFindSCU;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since May 2016
 */
@ApplicationScoped
public class CFindSCUImpl implements CFindSCU {

    private static final ElementDictionary DICT = ElementDictionary.getStandardElementDictionary();

    @Inject
    private Device device;

    @Inject
    private IApplicationEntityCache aeCache;

    @Override
    public Attributes queryStudy(ApplicationEntity localAE, String callingAET, String calledAET, String studyIUID)
            throws Exception {
        ApplicationEntity remoteAE = aeCache.get(calledAET);
        Association as = localAE.connect(remoteAE, createAARQ(callingAET));
        try {
            DimseRSP rsp = as.cfind(UID.StudyRootQueryRetrieveInformationModelFIND, Priority.NORMAL,
                    mkQueryStudyKeys(studyIUID), UID.ImplicitVRLittleEndian, 0);
            rsp.next();
            return rsp.getDataset();
        } finally {
            as.waitForOutstandingRSP();
            as.release();
        }
    }

    private Attributes mkQueryStudyKeys(String studyIUID) {
        ArchiveDeviceExtension arcdev = device.getDeviceExtension(ArchiveDeviceExtension.class);
        int[] patTags = arcdev.getAttributeFilter(Entity.Patient).getSelection();
        int[] studyTags = arcdev.getAttributeFilter(Entity.Study).getSelection();
        Attributes keys = new Attributes(patTags.length + studyTags.length);
        keys.setString(Tag.QueryRetrieveLevel, VR.CS, "STUDY");
        setReturnKeys(keys, patTags);
        setReturnKeys(keys, studyTags);
        keys.setString(Tag.StudyInstanceUID, VR.UI, studyIUID);
        return keys;
    }

    private void setReturnKeys(Attributes keys, int[] tags) {
        for (int tag : tags)
            if (tag != Tag.SpecificCharacterSet)
                keys.setNull(tag, DICT.vrOf(tag));
    }

    private AAssociateRQ createAARQ(String callingAET) {
        AAssociateRQ aarq = new AAssociateRQ();
        aarq.setCallingAET(callingAET);
        aarq.addPresentationContext(new PresentationContext(
                1, UID.StudyRootQueryRetrieveInformationModelFIND, UID.ImplicitVRLittleEndian));
        return aarq;
    }
}
