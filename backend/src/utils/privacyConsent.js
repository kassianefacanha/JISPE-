const privacyNoticeVersion = 'jispe-2026-1';

const createPrivacyConsent = (acceptedBy, acceptedByType) => ({
  acceptedAt: new Date(),
  acceptedBy: String(acceptedBy),
  acceptedByType,
  version: privacyNoticeVersion,
});

module.exports = { createPrivacyConsent };
