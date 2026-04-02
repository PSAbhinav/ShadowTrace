/**
 * ShadowTrace AI Skills
 * Reusable logic for threat analysis and response (ESM).
 */

// 1. Threat Classification Skill
export const classificationSkill = (logData) => {
    const { endpoint, status, type } = logData;
    
    if (endpoint === "/admin" && status === "fail") return "Brute Force";
    if (endpoint === "/api/data" && type === "api_request") return "API Abuse";
    if (endpoint === "/admin" && status === "success") return "Unauthorized Access (Escalated)";
    
    return "Normal";
};

// 2. Risk Scoring Skill
export const scoringSkill = (threatType, frequency = 1) => {
    if (threatType === "Normal") return { level: "Low", score: 0 };
    
    let score = frequency * 10;
    if (threatType === "Brute Force") score += 50;
    if (threatType === "API Abuse") score += 30;
    if (threatType === "Unauthorized Access (Escalated)") score += 90;

    let level = "Low";
    if (score >= 70) level = "High";
    else if (score >= 30) level = "Medium";

    return { level, score };
};

// 3. Explanation Skill
export const explanationSkill = (threatData) => {
    const { type, ip, endpoint, count } = threatData;
    
    if (type === "Brute Force") {
        return `Possible brute-force attack from IP ${ip} targeting sensitive endpoint ${endpoint}. Detected ${count} failed attempts in a short burst.`;
    }
    if (type === "API Abuse") {
        return `Abnormal API usage spike from IP ${ip}. Source is requesting ${endpoint} at an unsustainable rate, which may indicate automated scrapers or DoS attempt.`;
    }
    if (type === "Unauthorized Access (Escalated)") {
        return `Critical: Successful login to restricted area ${endpoint} from suspicious source ${ip} without proper secondary authorization patterns.`;
    }

    return "No anomalies detected in the provided log sample.";
};

// 4. Recommendation Skill
export const recommendationSkill = (threatType) => {
    const recommendations = {
        "Brute Force": [
            "Implement IP-based rate limiting on sensitive endpoints.",
            "Enforce Multi-Factor Authentication (MFA) for all administrative accounts.",
            "Temporarily block source IP"
        ],
        "API Abuse": [
            "Apply stricter rate-limiting headers to /api/data.",
            "Challenge suspicious traffic with CAPTCHA or proof-of-work.",
            "Rotate API keys if source is authenticated."
        ],
        "Unauthorized Access (Escalated)": [
            "Immediate account lockout for affected user.",
            "Audit all recent actions performed by session.",
            "Force credential reset and re-authentication."
        ]
    };

    return recommendations[threatType] || ["Continue monitoring for further anomalies."];
};
