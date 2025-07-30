/**
 * @fileOverview This file contains hardcoded mappings for DefectDojo entities,
 * similar to the user's Python script. This provides a reliable way to map
 * user-friendly names to specific DefectDojo engagement IDs, which is crucial
 * for accurate filtering of vulnerabilities by tool.
 */

// Maps a user-friendly tool name (lowercase) to a specific Engagement ID in DefectDojo.
// This is the most reliable way to filter findings for a specific tool.
export const TOOL_ENGAGEMENT_MAP: Record<string, { id: number; name: string; type: string; }> = {
    "contrast": {
        "id": 1,
        "name": "Contrast tool (SAST/IAST)",
        "type": "SAST/IAST"
    },
    "rapid7": {
        "id": 2,
        "name": "Nexpose (Rapid7) Carelink",
        "type": "Vulnerability Scanner"
    },
    "sonarqube": {
        "id": 3,
        "name": "Sonarqube",
        "type": "SAST"
    },
    "dependency_track": {
        "id": 4,
        "name": "DependencyTrack",
        "type": "SCA"
    },
    "jfrog": {
        "id": 5,
        "name": "Jfrog for Carelink",
        "type": "Artifact Scanner"
    },
    "patient_monitor": {
        "id": 9,
        "name": "MyCareLink_Patient_Monitor@M18.0.0_20230927",
        "type": "Product"
    },
    "vega_firmware": {
        "id": 10,
        "name": "Virtual Vega Telemetry Firmware",
        "type": "Firmware"
    },
    "mcls_ios": {
        "id": 11,
        "name": "MCLS_iOS",
        "type": "Mobile App"
    },
    "hardware_pentest": {
        "id": 12,
        "name": "Hardware Pen testing",
        "type": "Penetration Testing"
    },
    "ad_hoc": {
        "id": 13,
        "name": "Ad Hoc Engagement",
        "type": "Manual Testing"
    },
    "mcls_android": {
        "id": 14,
        "name": "MCLS_Android",
        "type": "Mobile App"
    },
    "dt_azure": {
        "id": 15,
        "name": "DependencyTrack Azure Astra",
        "type": "SCA"
    },
    "dt_dlut": {
        "id": 16,
        "name": "DependencyTrack DLUT",
        "type": "SCA"
    },
    "clem_ios_dt": {
        "id": 18,
        "name": "CRM_CLEM_iOS@9.2.0-Dependency track",
        "type": "SCA"
    },
    "clem_android_dt": {
        "id": 19,
        "name": "CRM_CLEM_Android@2.5.0_20231211-DependencyTrack",
        "type": "SCA"
    },
    "clem_connector_dt": {
        "id": 20,
        "name": "CRM_CLEM_Patient_Connector@24965_20231211-DependencyTrack",
        "type": "SCA"
    },
    "ev_icd_dt": {
        "id": 21,
        "name": "CRM_EV_ICD@8.5_20231206-DependencyTrack",
        "type": "SCA"
    },
    "lmm_dt": {
        "id": 22,
        "name": "CRM_LMM_iOS@2.10.0_20231114-Dependencytrack",
        "type": "SCA"
    },
    "mclh_ios_dt": {
        "id": 23,
        "name": "CRM_MyCareLinkHeart_iOS@4.3.1_20250102-DependencyTrack",
        "type": "SCA"
    },
    "mclh_android_dt": {
        "id": 24,
        "name": "CRM_MyCareLinkHeart_Android@4.3.1_20250102-DependencyTrack",
        "type": "SCA"
    },
    "mcls_ios_dt": {
        "id": 25,
        "name": "CRM_MCLS_iOS@5.6_20240411-DependencyTrack",
        "type": "SCA"
    },
    "mcls_android_dt": {
        "id": 26,
        "name": "CRM_MCLS_Android@5.6_20240411-DependencyTrack",
        "type": "SCA"
    },
    "cloud_guard": {
        "id": 28,
        "name": "CloudGuard",
        "type": "Cloud Security"
    },
    "smart_sync": {
        "id": 29,
        "name": "CRM_SmartSync Programmer@24970A_Basestation_Firmware",
        "type": "Firmware"
    }
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

// A simple list of known component names to help with parsing from vulnerability titles.
// This helps standardize component names.
export const KNOWN_COMPONENTS: string[] = [
    "openssl", "libssl", "gnutls", "mbedTLS",
    "log4j", "logback", "spring-core", "spring-security", "hibernate", "jackson-databind", "commons-fileupload", "commons-collections", "struts2", "junit", "bouncycastle",
    "flask", "django", "numpy", "pandas", "requests", "pyyaml", "jinja2", "sqlalchemy", "cryptography", "python",
    "jquery", "lodash", "moment.js", "angular", "react", "vue", "handlebars", "bootstrap", "express", "axios", "socket.io",
    "laravel", "symfony", "phpmailer", "twig", "codeigniter",
    "zlib", "libxml2", "curl", "libpng", "glibc",
    "mysql-connector", "psycopg2", "mongoose", "sqlite", "knex.js", "typeorm",
    "nginx", "apache", "tomcat", "httpd", "istio", "haproxy", "go",
    "tensorflow", "pytorch", "scikit-learn", "keras", "xgboost",
    "aws-sdk", "google-cloud-storage", "azure-core", "boto3",
    "docker", "kubernetes", "helm", "jenkins", "terraform", "ansible",
    "wolfssl", "libtommath"
];
