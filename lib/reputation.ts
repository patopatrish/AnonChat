/**
 * Simple reputation scoring logic (Experimental)
 */

const STORAGE_KEY_PREFIX = "anonchat_activity_";

type ActivityStats = {
    messagesSent: number;
    groupsJoined: number;
};

function getStats(publicKey: string): ActivityStats {
    if (typeof window === "undefined") return { messagesSent: 0, groupsJoined: 0 };
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + publicKey);
    if (!data) return { messagesSent: 0, groupsJoined: 0 };
    try {
        return JSON.parse(data);
    } catch (e) {
        return { messagesSent: 0, groupsJoined: 0 };
    }
}

function saveStats(publicKey: string, stats: ActivityStats) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_PREFIX + publicKey, JSON.stringify(stats));
}

export function calculateReputation(publicKey: string | null): number {
    if (!publicKey) return 0;

    const stats = getStats(publicKey);
    const baseScore = 10;
    const messageWeight = 1;
    const groupWeight = 5;

    return baseScore + (stats.messagesSent * messageWeight) + (stats.groupsJoined * groupWeight);
}

export function trackActivity(publicKey: string | null, type: 'message' | 'group') {
    if (!publicKey) return;

    const stats = getStats(publicKey);
    if (type === 'message') {
        stats.messagesSent += 1;
    } else if (type === 'group') {
        stats.groupsJoined += 1;
    }

    saveStats(publicKey, stats);

    // Dispatch a custom event to notify components that reputation might have changed
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reputationUpdate"));
    }
}
