package org.dcm4chee.arc.stgcmt.scp;

import org.dcm4che3.data.Attributes;
import org.dcm4chee.arc.qmgt.Outcome;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since Sep 2015
 */
public interface StgCmtSCP {
    String QUEUE_NAME = "StgCmtSCP";
    String JNDI_NAME = "jms/queue/StgCmtSCP";

    Outcome sendNEventReport(String localAET, String remoteAET, Attributes eventInfo) throws Exception;
}
