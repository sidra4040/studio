/**
 * @fileOverview This file contains hardcoded mappings for DefectDojo entities,
 * similar to the user's Python script. This provides a reliable way to map
 * user-friendly names to specific DefectDojo engagement IDs, which is crucial
 * for accurate filtering of vulnerabilities by tool.
 */

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
    "openssl", "libssl", "gnutls", "mbedTLS", "wolfssl",
    "log4j", "logback", "spring-core", "spring-security", "hibernate", "jackson-databind", "commons-fileupload", "commons-collections", "struts2", "junit", "bouncycastle",
    "flask", "django", "numpy", "pandas", "requests", "pyyaml", "jinja2", "sqlalchemy", "cryptography", "python",
    "jquery", "lodash", "moment.js", "angular", "react", "vue", "handlebars", "bootstrap", "express", "axios", "socket.io", "crypto-js",
    "laravel", "symfony", "phpmailer", "twig", "codeigniter",
    "zlib", "libxml2", "curl", "libpng", "glibc", "go", "golang",
    "mysql-connector", "psycopg2", "mongoose", "sqlite", "knex.js", "typeorm",
    "nginx", "apache", "tomcat", "httpd", "istio", "haproxy",
    "tensorflow", "pytorch", "scikit-learn", "keras", "xgboost",
    "aws-sdk", "google-cloud-storage", "azure-core", "boto3",
    "docker", "kubernetes", "helm", "jenkins", "terraform", "ansible",
    "libtommath"
].sort((a, b) => b.length - a.length); // Sort by length descending to match longer names first
