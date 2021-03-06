package org.dcm4chee.arc.hl7;

import org.dcm4che3.data.Attributes;
import org.dcm4che3.data.Tag;
import org.dcm4che3.hl7.HL7Exception;
import org.dcm4che3.hl7.HL7Segment;
import org.dcm4che3.net.Connection;
import org.dcm4che3.net.hl7.HL7Application;
import org.dcm4che3.net.hl7.service.DefaultHL7Service;
import org.dcm4che3.net.hl7.service.HL7Service;
import org.dcm4chee.arc.conf.ArchiveHL7ApplicationExtension;
import org.dcm4chee.arc.entity.Patient;
import org.dcm4chee.arc.patient.PatientMgtContext;
import org.dcm4chee.arc.patient.PatientService;
import org.xml.sax.SAXException;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.inject.Typed;
import javax.inject.Inject;
import javax.xml.transform.TransformerConfigurationException;
import java.io.IOException;
import java.net.Socket;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since Sep 2015
 */
@ApplicationScoped
@Typed(HL7Service.class)
class PatientUpdateService extends DefaultHL7Service {

    @Inject
    private PatientService patientService;

    public PatientUpdateService() {
        super("ADT^A02", "ADT^A03", "ADT^A06", "ADT^A07", "ADT^A08", "ADT^A28", "ADT^A31", "ADT^A40", "ADT^A47");
    }

    @Override
    public byte[] onMessage(HL7Application hl7App, Connection conn, Socket s, HL7Segment msh,
                            byte[] msg, int off, int len, int mshlen) throws HL7Exception {
        try {
            updatePatient(hl7App, s, msh, msg, off, len, patientService);
        } catch (HL7Exception e) {
            throw e;
        } catch (Exception e) {
            new HL7Exception(HL7Exception.AE, e);
        }
        return super.onMessage(hl7App, conn, s, msh, msg, off, len, mshlen);
    }

    static Patient updatePatient(HL7Application hl7App, Socket s, HL7Segment msh, byte[] msg, int off, int len,
                                 PatientService patientService)
            throws HL7Exception, IOException, SAXException, TransformerConfigurationException {
        ArchiveHL7ApplicationExtension arcHL7App =
                hl7App.getHL7ApplicationExtension(ArchiveHL7ApplicationExtension.class);
        String hl7cs = msh.getField(17, hl7App.getHL7DefaultCharacterSet());
        Attributes attrs = SAXTransformer.transform(
                msg, off, len, hl7cs, arcHL7App.patientUpdateTemplateURI(), null);
        PatientMgtContext ctx = patientService.createPatientMgtContextHL7(s, msh);
        ctx.setAttributes(attrs);
        if (ctx.getPatientID() == null)
            throw new HL7Exception(HL7Exception.AR, "Missing PID-3");
        Attributes mrg = attrs.getNestedDataset(Tag.ModifiedAttributesSequence);
        if (mrg == null)
            return patientService.updatePatient(ctx);

        ctx.setPreviousAttributes(mrg);
        if (ctx.getPreviousPatientID() == null)
            throw new HL7Exception(HL7Exception.AR, "Missing MRG-1");
        return "ADT^A47".equals(msh.getMessageType())
                ? patientService.changePatientID(ctx)
                : patientService.mergePatient(ctx);
    }
}
