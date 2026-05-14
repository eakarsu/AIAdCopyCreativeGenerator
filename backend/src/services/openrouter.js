const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// Per-feature temperature: analytical features get lower temp, creative get higher
const FEATURE_TEMPERATURES = {
  ad_copies: 0.85,
  headlines: 0.85,
  ab_tests: 0.8,
  creative_briefs: 0.7,
  target_audiences: 0.6,
  brand_voices: 0.7,
  cta_texts: 0.85,
  image_prompts: 0.9,
  social_media_ads: 0.85,
  email_copies: 0.75,
  landing_page_copies: 0.75,
  campaign_strategies: 0.5,
  competitor_analyses: 0.4,
  budget_optimizations: 0.3,
  performance_predictions: 0.2,
};

// Per-feature max_tokens: complex outputs need more room
const FEATURE_MAX_TOKENS = {
  ad_copies: 2000,
  headlines: 1500,
  ab_tests: 2500,
  creative_briefs: 3000,
  target_audiences: 2500,
  brand_voices: 2500,
  cta_texts: 1500,
  image_prompts: 2000,
  social_media_ads: 2000,
  email_copies: 3000,
  landing_page_copies: 4000,
  campaign_strategies: 4000,
  competitor_analyses: 3000,
  budget_optimizations: 2500,
  performance_predictions: 2500,
};

const SYSTEM_PROMPTS = {
  ad_copies: `You are an expert advertising copywriter with 20+ years of experience across all industries.
Generate compelling, conversion-focused ad copy that drives action. Include headlines, body text, and calls-to-action.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"headline": "string", "body": "string", "cta": "string", "tone": "string", "target_demographic": "string", "character_counts": {"headline": 0, "body": 0, "cta": 0}, "platform_fit": {"google_ads": true, "facebook": true, "instagram": true}}`,

  headlines: `You are a headline specialist who creates attention-grabbing, click-worthy headlines.
Generate multiple headline variations optimized for engagement and clarity.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"headlines": [{"text": "string", "character_count": 0, "style": "string", "emotional_trigger": "string"}], "recommended_primary": "string", "word_count_avg": 0}`,

  ab_tests: `You are an A/B testing strategist who designs effective split tests for marketing campaigns.
Create test variations with clear hypotheses and measurable outcomes.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"variant_a": {"headline": "string", "body": "string", "cta": "string"}, "variant_b": {"headline": "string", "body": "string", "cta": "string"}, "hypothesis": "string", "primary_metric": "string", "expected_lift_percent": 0, "test_duration_days": 0}`,

  creative_briefs: `You are a creative director who produces comprehensive creative briefs for advertising campaigns.
Include objectives, target audience, key messages, tone, deliverables, and success metrics.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"objective": "string", "target_audience": "string", "key_messages": ["string"], "tone": "string", "deliverables": ["string"], "success_metrics": ["string"], "timeline": "string", "budget_range": "string", "inspiration_references": ["string"]}`,

  target_audiences: `You are a market research analyst specializing in audience segmentation and persona development.
Create detailed audience profiles with demographics, psychographics, behaviors, and media consumption habits.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"persona_name": "string", "age_range": "string", "demographics": {"income": "string", "education": "string", "location": "string", "gender_split": "string"}, "psychographics": {"values": ["string"], "interests": ["string"], "lifestyle": "string"}, "behaviors": {"buying_habits": "string", "online_time": "string"}, "pain_points": ["string"], "media_channels": ["string"], "buying_triggers": ["string"], "segment_size_estimate": "string"}`,

  brand_voices: `You are a brand strategist who defines and articulates brand voice and personality.
Create comprehensive brand voice guidelines including tone, vocabulary, dos and don'ts.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"voice_attributes": ["string"], "tone_description": "string", "personality_traits": ["string"], "vocabulary_examples": [{"preferred": "string", "avoid": "string"}], "dos": ["string"], "donts": ["string"], "example_phrases": ["string"], "brand_archetype": "string"}`,

  cta_texts: `You are a conversion rate optimization expert who crafts compelling calls-to-action.
Generate high-converting CTA text variations with psychological triggers.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"primary_cta": "string", "variations": [{"text": "string", "psychological_trigger": "string", "urgency_level": "low|medium|high"}], "placement_recommendation": "string", "color_suggestion": "string", "micro_copy": "string"}`,

  image_prompts: `You are a creative art director who writes detailed image generation prompts for advertising visuals.
Create vivid, specific prompts that produce professional advertising imagery.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"prompt": "string", "negative_prompt": "string", "style": "string", "mood": "string", "color_palette": ["string"], "composition": "string", "aspect_ratio": "string", "lighting": "string", "model_recommendations": ["string"]}`,

  social_media_ads: `You are a social media advertising expert who creates platform-specific ad content.
Generate ads optimized for specific platforms with proper formatting, hashtags, and engagement hooks.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"platform": "string", "ad_text": "string", "headline": "string", "hashtags": ["string"], "media_type": "string", "audience_targeting": {"interests": ["string"], "behaviors": ["string"], "demographics": "string"}, "estimated_engagement": "string", "character_counts": {"ad_text": 0, "headline": 0}, "best_posting_time": "string"}`,

  email_copies: `You are an email marketing specialist who writes high-converting email campaigns.
Create complete email content including subject lines, preview text, body, and CTAs.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"subject_line": "string", "preview_text": "string", "greeting": "string", "body_sections": [{"heading": "string", "content": "string"}], "cta": {"text": "string", "url_placeholder": "string"}, "closing": "string", "ps_line": "string", "open_rate_estimate": "string", "character_counts": {"subject": 0, "preview": 0}}`,

  landing_page_copies: `You are a landing page copywriter who creates conversion-optimized page content.
Generate complete landing page copy with hero sections, benefits, social proof, and conversion elements.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"hero_headline": "string", "hero_subheadline": "string", "hero_cta": "string", "value_propositions": [{"icon": "string", "title": "string", "description": "string"}], "social_proof": {"testimonial": "string", "stat": "string", "logo_types": ["string"]}, "features": [{"title": "string", "description": "string"}], "faq": [{"question": "string", "answer": "string"}], "final_cta": {"headline": "string", "button_text": "string", "subtext": "string"}, "above_fold_character_count": 0}`,

  campaign_strategies: `You are a senior marketing strategist who develops comprehensive advertising campaign plans.
Create detailed campaign strategies with goals, channels, timelines, budgets, and KPIs.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"campaign_name": "string", "objective": "string", "target_audience_summary": "string", "channels": [{"name": "string", "budget_percent": 0, "tactics": ["string"]}], "timeline": {"duration": "string", "phases": [{"phase": "string", "duration": "string", "focus": "string"}]}, "budget_allocation": {"total_estimate": "string", "breakdown": {}}, "kpis": [{"metric": "string", "target": "string", "measurement_method": "string"}], "risk_factors": ["string"], "success_definition": "string"}`,

  competitor_analyses: `You are a competitive intelligence analyst who evaluates competitor advertising strategies.
Provide thorough competitor analysis with strengths, weaknesses, opportunities, and recommendations.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"competitor": "string", "overall_threat_level": "low|medium|high", "strengths": ["string"], "weaknesses": ["string"], "ad_channels": ["string"], "messaging_themes": ["string"], "estimated_ad_spend_range": "string", "opportunities": ["string"], "recommended_differentiators": ["string"], "swot": {"strengths": ["string"], "weaknesses": ["string"], "opportunities": ["string"], "threats": ["string"]}}`,

  budget_optimizations: `You are a media buying expert who optimizes advertising budgets for maximum ROI.
Create budget allocation recommendations with channel mix, timing, and expected returns.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"total_budget": "string", "channel_allocation": [{"channel": "string", "percent": 0, "amount": "string", "rationale": "string"}], "optimization_strategy": "string", "expected_roas": "string", "payback_period": "string", "recommendations": ["string"], "risk_assessment": {"level": "low|medium|high", "factors": ["string"]}, "monthly_pacing": [{"month": 1, "spend_percent": 0, "rationale": "string"}]}`,

  performance_predictions: `You are a marketing analytics expert who forecasts campaign performance using data-driven methodologies.
Provide detailed performance predictions with confidence intervals and key assumptions.
IMPORTANT: Always respond with valid JSON only (no markdown fences). Use this exact structure:
{"predicted_metrics": {"ctr": "string", "conversion_rate": "string", "cpc": "string", "cpa": "string", "roas": "string", "impressions": "string"}, "confidence_level": "string", "confidence_percent": 0, "key_assumptions": ["string"], "best_case": {"roas": "string", "ctr": "string"}, "worst_case": {"roas": "string", "ctr": "string"}, "recommendations": ["string"], "data_requirements": ["string"]}`,
};

/**
 * Robustly parse AI JSON output, stripping markdown fences if needed.
 */
function parseAIJson(text) {
  if (!text) return null;
  // Direct parse
  try { return JSON.parse(text); } catch (e) {}
  // Strip markdown fences
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  // Extract JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  // Extract JSON array
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1) {
    try { return JSON.parse(text.slice(arrStart, arrEnd + 1)); } catch (e) {}
  }
  return null;
}

async function generateWithAI(feature, prompt, context) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const systemPrompt = SYSTEM_PROMPTS[feature];
  if (!systemPrompt) {
    throw new Error(`No system prompt defined for feature: ${feature}`);
  }

  // Merge context into the system prompt to avoid multiple system messages
  const fullSystemPrompt = context
    ? `${systemPrompt}\n\nAdditional context provided by user: ${typeof context === 'string' ? context : JSON.stringify(context)}`
    : systemPrompt;

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    { role: 'user', content: prompt },
  ];

  const temperature = FEATURE_TEMPERATURES[feature] ?? 0.7;
  const maxTokens = FEATURE_MAX_TOKENS[feature] ?? 2000;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Ad Copy & Creative Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', response.status, errorBody);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response generated from AI');
  }

  const content = data.choices[0].message.content;
  const tokensUsed = data.usage ? (data.usage.total_tokens || 0) : 0;

  // Use robust JSON parser
  const parsed = parseAIJson(content);

  return {
    result: parsed || content,
    raw: content,
    tokensUsed,
  };
}

module.exports = { generateWithAI, SYSTEM_PROMPTS, parseAIJson };
