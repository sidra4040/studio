/**
 * @fileOverview This file contains hardcoded mappings for DefectDojo entities,
 * similar to the user's Python script. This provides a reliable way to map
 * user-friendly names to specific DefectDojo engagement IDs, which is crucial
 * for accurate filtering of vulnerabilities by tool.
 */

// Maps a user-friendly tool name (lowercase) to a specific Engagement ID in DefectDojo.
// This is the most reliable way to filter findings for a specific tool.
export const TOOL_ENGAGEMENT_MAP: Record<string, { id: number; name: string }> = {
  contrast: {
    id: 1,
    name: 'Contrast tool (SAST/IAST)',
  },
  rapid7: {
    id: 2,
    name: 'Nexpose (Rapid7) Carelink',
  },
  sonarqube: {
    id: 3,
    name: 'Sonarqube',
  },
  dependency_track: {
    id: 4,
    name: 'DependencyTrack',
  },
  jfrog: {
    id: 5,
    name: 'Jfrog for Carelink',
  },
  cloud_guard: {
    id: 28,
    name: 'CloudGuard',
  },
  // Add other tool mappings here as needed
};

// Maps a user-friendly product name to its ID in DefectDojo.
export const PRODUCT_MAP: Record<string, { id: number; name: string }> = {
  accurhythm_zelda_ai: { id: 7, name: 'AccuRhythm Zelda AI' },
  azure_astra: { id: 18, name: 'Azure Astra' },
  clem: { id: 10, name: 'CLEM' },
  carelink_network: { id: 1, name: 'Carelink Network' },
  dlut: { id: 5, name: 'Device Lookup Tool(DLUT)' },
  evicd: { id: 17, name: 'EVICD' },
  linq_mobile_manager: { id: 9, name: 'Linq Mobile Manager' },
  mclh: { id: 11, name: 'MCLH' },
  mcls: { id: 3, name: 'MCLS' },
  mas: { id: 6, name: 'Medtronic Application Services(MAS)' },
  mlife: { id: 19, name: 'Mlife' },
  mycarelink_relay: { id: 4, name: 'MyCareLink Relay' },
  mycarelink_patient_monitor: { id: 2, name: 'MyCareLink_Patient_Monitor' },
  patient_connector_24965: { id: 16, name: 'Patient Connector 24965' },
  patient_connector_24967: { id: 14, name: 'Patient Connector 24967' },
  patient_messaging: { id: 8, name: 'Patient Messaging' },
  smart_reader_25000: { id: 15, name: 'Smart Reader 25000' },
  smart_sync: { id: 12, name: 'Smart Sync' },
  smart_sync_base: { id: 13, name: 'Smart Sync Base' },
};
