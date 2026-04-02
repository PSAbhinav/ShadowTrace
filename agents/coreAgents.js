import { 
    classificationSkill, 
    scoringSkill, 
    explanationSkill, 
    recommendationSkill 
} from "../skills/coreSkills.js";
import { checkIPReputation } from "../src/lib/intel.js";

/**
 * Agent 1: Log Intake Agent
 * Normalizes raw log data and extracts core metadata.
 */
export const logIntakeAgent = (log) => {
    return {
        ...log,
        processedAt: new Date().toISOString(),
        isAnalyzable: !!log.ip && !!log.endpoint
    };
};

/**
 * Agent 2: Threat Intelligence Agent (AbuseIPDB Specialist)
 * Performs real-time global reputation checks.
 */
export const threatIntelAgent = async (processedLog) => {
    const rep = await checkIPReputation(processedLog.ip);
    return {
        ...processedLog,
        intel: rep
    };
};

/**
 * Agent 3: Threat Identification Agent (Heuristic Patterns)
 * Evaluates behavioral patterns like Lateral Movement or Data Exfiltration.
 */
export const threatIdentificationAgent = (intelLog) => {
    const type = classificationSkill(intelLog);
    const { level, score } = scoringSkill(type, 1);
    
    // Pattern: Data Exfiltration
    const isExfiltration = intelLog.endpoint.includes("export") || intelLog.payloadSize;
    const exfilScore = isExfiltration ? 40 : 0;
    
    // Pattern: Recon / Lateral Movement
    const isProber = (type === "Unauthorized Access" && intelLog.status === "403");

    // Final Weighted Score
    const totalScore = Math.min(100, score + (intelLog.intel.isMalicious ? intelLog.intel.score / 2 : 0) + exfilScore);
    const totalLevel = totalScore >= 70 ? "High" : (totalScore >= 30 ? "Medium" : "Low");

    let finalType = type;
    if (isExfiltration && totalLevel === "High") finalType = "Sensitive Data Exfiltration";
    else if (isProber) finalType = "Lateral Movement Probing";

    return {
        ...intelLog,
        threat: {
            detected: totalLevel !== "Low" || intelLog.intel.isMalicious,
            type: finalType,
            level: totalLevel,
            score: totalScore
        }
    };
};

/**
 * Agent 4: Security Analysis Agent (Reasoning)
 * Provides deep contextual explanation for the matched patterns.
 */
export const securityAnalysisAgent = (threatLog) => {
    if (!threatLog.threat.detected) return threatLog;
    
    let explanation = explanationSkill({
        type: threatLog.threat.type,
        ip: threatLog.ip,
        endpoint: threatLog.endpoint,
        count: 1
    });

    if (threatLog.intel.isMalicious) {
        explanation += ` | Intelligence Alert: AbuseIPDB reported this IP with ${threatLog.intel.score}% confidence.`;
    }

    if (threatLog.threat.type.includes("Exfiltration")) {
        explanation += ` | Behavior Alert: Unusual outbound payload detected (${threatLog.payloadSize || "Large"}).`;
    }

    return {
        ...threatLog,
        analyst: {
            explanation,
            reasoning: `Matched ${threatLog.threat.type} pattern. Global reputation confirms: ${threatLog.intel.isMalicious ? 'SUSPICIOUS' : 'CLEAR'}.`
        }
    };
};

/**
 * Agent 5: Remediation & Reporting Agent
 * Generates actionable fixes for the SOC.
 */
export const remediationAgent = (analystLog) => {
    if (analystLog.threat.level !== "High") return analystLog;
    
    const recommendations = recommendationSkill(analystLog.threat.type);
    
    return {
        ...analystLog,
        incidentReport: {
            summary: `Automated Incident Report: ${analystLog.threat.type} detected from ${analystLog.ip}`,
            recommendations,
            status: "OPEN"
        }
    };
};

/**
 * Agent Orchestrator: ShadowTrace Core (Pipeline)
 * Sequentially calls all 5 specialized agents.
 */
export const runAgentOrchestration = async (rawLog) => {
    let result = logIntakeAgent(rawLog);
    result = await threatIntelAgent(result);
    result = threatIdentificationAgent(result);
    result = securityAnalysisAgent(result);
    result = remediationAgent(result);
    
    return result;
};
