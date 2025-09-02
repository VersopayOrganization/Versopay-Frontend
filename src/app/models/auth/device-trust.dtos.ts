export type DeviceTrustChallengeDto = {
    challengeId: string;
    expiresAtUtc: string;   // ISO
    maskedEmail: string;
};

export type DeviceTrustConfirmRequest = {
    challengeId: string;
    code: string;
};
