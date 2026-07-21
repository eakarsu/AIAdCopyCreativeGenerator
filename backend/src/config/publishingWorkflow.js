'use strict';

module.exports = {
  table: 'publishing_workflows',
  initialStatus: 'draft',
  statuses: ['draft', 'review_ready', 'approved', 'published', 'cancelled'],
  editableStatuses: ['draft'],
  transitions: {
    draft: ['review_ready', 'cancelled'],
    review_ready: ['draft', 'approved', 'cancelled'],
    approved: ['review_ready', 'published', 'cancelled'],
    published: [], cancelled: [],
  },
  approvalStatuses: ['approved', 'published'],
  approverRoles: ['brand_reviewer', 'legal_reviewer', 'publisher', 'admin'],
  evidenceRoles: ['integration', 'brand_reviewer', 'legal_reviewer', 'publisher', 'admin'],
  syncRoles: ['integration', 'admin'],
  rolesByStatus: {
    approved: ['brand_reviewer', 'legal_reviewer', 'admin'],
    published: ['publisher', 'admin'],
  },
  separationOfDuties: { published: { priorStatus: 'approved', disallowSameActor: true } },
  providerRequirementsByStatus: { published: { anyOf: ['cms', 'ad_platform'] } },
  requiredFields: ['brief', 'brandRulesVersion', 'channels', 'draftVersion'],
  requiredEvidence: ['brand_rules', 'rights_record', 'fact_evidence', 'channel_contract'],
  deterministicChecks: [
    { code: 'CHANNELS_DECLARED', test: (p) => Array.isArray(p.channels) && p.channels.length > 0 },
    { code: 'DISCLOSURE_DECIDED', test: (p) => typeof p.disclosureRequired === 'boolean' },
    { code: 'PROMPT_CONTENT_NOT_EXECUTABLE', test: (p) => p.modelOutputTrusted !== true },
  ],
  providers: ['cms', 'dam', 'ad_platform', 'analytics', 'approval_system'],
  providerEnv: {
    cms: 'CMS_API_URL', dam: 'DAM_API_URL', ad_platform: 'AD_PLATFORM_API_URL',
    analytics: 'ANALYTICS_API_URL', approval_system: 'APPROVAL_SYSTEM_API_URL',
  },
};
