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

package org.dcm4chee.arc.procedure.impl;

import org.dcm4che3.audit.AuditMessages;
import org.dcm4che3.data.Attributes;
import org.dcm4che3.data.Issuer;
import org.dcm4che3.data.Tag;
import org.dcm4che3.data.VR;
import org.dcm4chee.arc.entity.IssuerEntity;
import org.dcm4chee.arc.entity.MWLItem;
import org.dcm4chee.arc.entity.Patient;
import org.dcm4chee.arc.issuer.IssuerService;
import org.dcm4chee.arc.patient.PatientMismatchException;
import org.dcm4chee.arc.procedure.ProcedureContext;

import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since Jun 2016
 */
@Stateless
public class ProcedureServiceEJB {

    @PersistenceContext(unitName="dcm4chee-arc")
    private EntityManager em;

    @Inject
    private IssuerService issuerService;

    public void updateProcedure(ProcedureContext ctx) {
        Patient patient = ctx.getPatient();
        Attributes attrs = ctx.getAttributes();
        Map<String, Attributes> mwlAttrsMap = createMWLAttrsMap(attrs);
        List<MWLItem> prevMWLItems = em.createNamedQuery(MWLItem.FIND_BY_STUDY_IUID, MWLItem.class)
                .setParameter(1, ctx.getStudyInstanceUID())
                .getResultList();
        IssuerEntity issuerOfAccessionNumber = findOrCreateIssuer(
                attrs.getNestedDataset(Tag.IssuerOfAccessionNumberSequence));
        for (MWLItem mwlItem : prevMWLItems) {
            Attributes mwlAttrs = mwlAttrsMap.remove(mwlItem.getScheduledProcedureStepID());
            if (mwlAttrs == null)
                em.remove(mwlItem);
            else {
                if (mwlItem.getPatient().getPk() != patient.getPk())
                    throw new PatientMismatchException("" + patient + " does not match " +
                            mwlItem.getPatient() + " in previous " + mwlItem);
                mwlItem.setAttributes(mwlAttrs, ctx.getAttributeFilter(), ctx.getFuzzyStr());
                mwlItem.setIssuerOfAccessionNumber(issuerOfAccessionNumber);
            }
        }
        for (Attributes mwlAttrs : mwlAttrsMap.values()) {
            MWLItem mwlItem = new MWLItem();
            mwlItem.setPatient(patient);
            mwlItem.setAttributes(mwlAttrs, ctx.getAttributeFilter(), ctx.getFuzzyStr());
            mwlItem.setIssuerOfAccessionNumber(issuerOfAccessionNumber);
            em.persist(mwlItem);
        }
        ctx.setEventActionCode(prevMWLItems.isEmpty()
                ? AuditMessages.EventActionCode.Create
                : AuditMessages.EventActionCode.Update);
    }

    private IssuerEntity findOrCreateIssuer(Attributes item) {
        return item != null ? issuerService.findOrCreate(new Issuer(item)) : null;
    }

    private Map<String, Attributes> createMWLAttrsMap(Attributes attrs) {
        Attributes root = new Attributes(attrs);
        Iterator<Attributes> spsItems = root.getSequence(Tag.ScheduledProcedureStepSequence).iterator();
        root.setNull(Tag.ScheduledProcedureStepSequence, VR.SQ);
        Map<String, Attributes> map = new HashMap<>(4);
        while (spsItems.hasNext()) {
            Attributes sps = spsItems.next();
            spsItems.remove();
            Attributes mwlAttrs = new Attributes(root);
            mwlAttrs.newSequence(Tag.ScheduledProcedureStepSequence, 1).add(sps);
            map.put(sps.getString(Tag.ScheduledProcedureStepID), mwlAttrs);
        }
        return map;
    }
}
