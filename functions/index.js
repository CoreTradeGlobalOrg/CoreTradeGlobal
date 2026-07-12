/**
 * Cloud Functions for CoreTradeGlobal
 *
 * These functions use Firebase Admin SDK to perform privileged operations
 * that cannot be done from the client side.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { Resend } = require('resend');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Lazy Resend initialization — only created when first email is sent.
// Set RESEND_API_KEY in functions/.env or via firebase functions:config:set resend.api_key='re_xxxxx'
let _resend = null;
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

/**
 * Role constants (duplicated here to avoid ESM import in CJS Cloud Functions)
 * Source of truth: src/core/constants/roles.js
 */
const ROLES = {
  MEMBER: 'member',
  LOGISTICS_PROVIDER: 'logistics_provider',
  INSURANCE_PROVIDER: 'insurance_provider',
  LAWYER: 'lawyer',
  ADMIN: 'admin',
};

const ROLE_VALUES = Object.values(ROLES);

// Roles assignable via invite flow (members self-register, admins are bootstrapped)
const VALID_INVITE_ROLES = [
  ROLES.LOGISTICS_PROVIDER,
  ROLES.INSURANCE_PROVIDER,
  ROLES.LAWYER,
];

/**
 * App URL for generating invite sign-in links.
 * Set APP_URL environment variable or configure via functions.config().app.url
 */
const APP_URL = process.env.APP_URL || 'https://coretradeglobal.com';

/**
 * Helper function to check if user is admin
 * Uses custom claims from the verified token for security (no Firestore read).
 * Falls back to Firestore for legacy accounts without claims.
 */
async function isUserAdmin(userId) {
  if (!userId) return false;
  try {
    // Primary check: custom claims on the Firebase Auth token
    const userRecord = await admin.auth().getUser(userId);
    const claims = userRecord.customClaims || {};
    if (claims.role !== undefined) {
      return claims.role === 'admin';
    }
    // Fallback for legacy accounts: Firestore document read
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    return userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Management Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build branded HTML email for invite/onboarding links.
 */
function buildInviteEmailHtml(name, role, signInLink) {
  const roleName = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      You have been invited to join CoreTradeGlobal as a <strong style="color:#FFD700;">${roleName}</strong>.
      Click the button below to set up your account.
    </p>
  `;
  return buildBrandedEmailHtml(
    body,
    'Accept Invite &amp; Set Up Account',
    signInLink,
    'This link expires in 7 days. If you did not expect this invitation, you can ignore this email.'
  );
}

/**
 * Build branded welcome email HTML for newly self-registered users.
 * Placeholders {{displayName}} and {{userID}} are replaced with the user's data.
 */
function buildWelcomeEmailHtml(displayName, userID) {
  const safeName = String(displayName || 'there').replace(/[<>]/g, '');
  const safeId = String(userID || '');
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to CoreTradeGlobal</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0f1b2b; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  .btn-cta:hover { background: #fdb931 !important; }
  .quick-link:hover { background-color: rgba(255, 215, 0, 0.12) !important; border-color: rgba(255, 215, 0, 0.35) !important; }
  .step-btn { display: inline-block; width: 90px; padding: 0; background-color: rgba(255, 215, 0, 0.07); border: 1px solid rgba(255, 215, 0, 0.28); border-radius: 10px; text-decoration: none; box-sizing: border-box; vertical-align: middle; }
  .step-btn:hover { background-color: rgba(255, 215, 0, 0.18) !important; border-color: rgba(255, 215, 0, 0.6) !important; box-shadow: 0 0 14px rgba(255, 215, 0, 0.18) !important; }
  @media only screen and (max-width: 599px) {
    .menu-item { display: inline-block !important; padding: 6px 10px !important; }
    .menu-bullet { display: none !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1b2b; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f1b2b; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 30px 10px 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #1a283b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
          <tr>
            <td style="padding: 30px 40px 15px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 30px; font-weight: 800; margin: 0 0 15px 0; line-height: 1.35;">
                Welcome to<br /><span style="color: #ffd700;">CoreTradeGlobal!</span>
              </h1>
              <p style="color: #e2e8f0; font-size: 18px; line-height: 1.6; margin: 0;">
                Hey ${safeName}, we are thrilled to welcome you to the family! You are now part of a B2B trade network connecting importers and exporters with integrated logistics and transit insurance. Complete the 3 quick steps below to get started:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 10px 40px;">
              <h3 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">How to Get Started</h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 15px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/profile/${safeId}" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/social/drawable-xxhdpi/ic_person_white_24dp.png" alt="Profile" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Profile</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 14px; font-weight: 800; margin-bottom: 4px;">Let's complete your profile!</div>
                          <p style="color: #f1f5f9; font-size: 13px; line-height: 1.5; margin: 0;">Upload your logo, website, LinkedIn, description, and documents to build trust.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/product/new" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/action/drawable-xxhdpi/ic_shopping_cart_white_24dp.png" alt="Products" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Products</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 14px; font-weight: 800; margin-bottom: 4px;">Upload your first product!</div>
                          <p style="color: #f1f5f9; font-size: 13px; line-height: 1.5; margin: 0 0 6px 0;">Upload products with pricing, details, and delivery terms.</p>
                          <div style="background-color: rgba(255,215,0,0.04); border: 1px dashed rgba(255,215,0,0.35); border-radius: 8px; padding: 6px 10px; color: #ffd700; font-size: 12px; line-height: 1.4;">
                            <strong>&#128161; Bulk Upload:</strong> Send us your CSV file from your profile page and we'll upload your products.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/request/new" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/action/drawable-xxhdpi/ic_assignment_white_24dp.png" alt="RFQ" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Post RFQ</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 14px; font-weight: 800; margin-bottom: 4px;">Create your first RFQ!</div>
                          <p style="color: #f1f5f9; font-size: 13px; line-height: 1.5; margin: 0;">Enter requirements to receive and compare live quotes from global suppliers.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 40px 20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#ffd700" style="border-radius: 99px;">
                    <a href="https://coretradeglobal.com/" target="_blank" class="btn-cta" style="display: inline-block; padding: 16px 36px; font-size: 18px; font-weight: 700; color: #0f1b2b; text-decoration: none; border-radius: 99px; background-color: #ffd700;">Go to Dashboard &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 20px 40px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; text-align: center;">Explore the Platform</div>
              <table border="0" cellpadding="0" cellspacing="0" class="explore-menu" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/products" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Browse Products</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/requests" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Browse RFQs</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/about-us" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">About Us</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/faq" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">FAQ</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/fairs" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Trade Fairs</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; text-align: center;">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="https://linkedin.com/company/coretradeglobal" target="_blank" style="color: #94a3b8; text-decoration: none;">
                <img src="https://img.icons8.com/ios-filled/50/94a3b8/linkedin.png" alt="LinkedIn" width="20" style="display: inline-block; width: 20px; height: auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 15px; color: #ffd700; font-size: 16px;">
              <a href="mailto:info@coretradeglobal.com" style="color: #ffd700; text-decoration: none; font-weight: 500;">info@coretradeglobal.com</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 15px 20px; color: #64748b; font-size: 14px; line-height: 1.5;">You are receiving this email because you signed up for CoreTradeGlobal.</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px; line-height: 1.5; padding: 0 20px;">
              &copy; 2026 CoreTradeGlobal Inc. All rights reserved.
              <br /><br />
              <a href="https://coretradeglobal.com/privacy-policy" target="_blank" style="color: #64748b; text-decoration: underline;">Privacy Policy</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://coretradeglobal.com/terms" target="_blank" style="color: #64748b; text-decoration: underline;">Terms of Service</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build the "Upload Your Products" reminder email HTML.
 *
 * Sent 24 hours after registration by the sendProductUploadReminder
 * scheduled function. Only dynamic value is the recipient's displayName;
 * everything else is baked in (buttons deep-link to /product/new, bulk
 * upload instructions, standard footer).
 */
function buildProductUploadEmailHtml(displayName) {
  const safeName = String(displayName || 'there').replace(/[<>]/g, '');
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Upload Your Products on CoreTradeGlobal</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0f1b2b; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  .btn-cta:hover { background: #fdb931 !important; }
  .step-btn { display: inline-block; width: 90px; padding: 0; background-color: rgba(255, 215, 0, 0.07); border: 1px solid rgba(255, 215, 0, 0.28); border-radius: 10px; text-decoration: none; box-sizing: border-box; vertical-align: middle; }
  .step-btn:hover { background-color: rgba(255, 215, 0, 0.18) !important; border-color: rgba(255, 215, 0, 0.6) !important; box-shadow: 0 0 14px rgba(255, 215, 0, 0.18) !important; }
  @media only screen and (max-width: 599px) {
    .menu-item { display: inline-block !important; padding: 6px 10px !important; }
    .menu-bullet { display: none !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1b2b; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f1b2b; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 30px 10px 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #1a283b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
          <tr>
            <td style="padding: 30px 40px 15px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 30px; font-weight: 800; margin: 0 0 15px 0; line-height: 1.35;">
                Showcase Your<br /><span style="color: #ffd700;">Products Globally!</span>
              </h1>
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0; text-align: left;">
                Hey ${safeName},<br /><br />
                Your profile is active, but you need to list your products so all our members can see them and start sending you direct quote invitations.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 10px 40px;">
              <h3 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">Quick &amp; Easy 3-Step Listing</h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 40px 15px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/product/new" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/action/drawable-xxhdpi/ic_description_white_24dp.png" alt="Details" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Details</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 17px; font-weight: 800; margin-bottom: 6px;">1. Basic Information</div>
                          <p style="color: #f1f5f9; font-size: 15px; line-height: 1.6; margin: 0;">Enter your product's name, select a category, and write a quick description. It's that simple!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/product/new" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/editor/drawable-xxhdpi/ic_attach_money_white_24dp.png" alt="Pricing" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Pricing</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 17px; font-weight: 800; margin-bottom: 6px;">2. Pricing &amp; Stock</div>
                          <p style="color: #f1f5f9; font-size: 15px; line-height: 1.6; margin: 0;">Specify stock levels and price. If you prefer to negotiate or provide custom quotes, simply set the price to 0.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                      <tr>
                        <td valign="middle" width="110" style="padding: 12px 0 12px 12px; text-align: center;">
                          <a href="https://www.coretradeglobal.com/product/new" target="_blank" class="step-btn">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="16" style="font-size: 1px; line-height: 1;">&nbsp;</td>
                                <td align="center" style="padding-top: 8px; font-size: 1px; line-height: 1;">
                                  <img src="https://cdn.jsdelivr.net/npm/material-design-icons@3.0.1/image/drawable-xxhdpi/ic_image_white_24dp.png" alt="Images" width="20" height="20" style="display: block; margin: 0 auto; width: 20px; height: 20px; border: 0;" />
                                </td>
                                <td width="16" align="right" valign="top" style="padding: 4px 4px 0 0; font-size: 10px; line-height: 1; color: #ffd700;">&#x2197;</td>
                              </tr>
                              <tr>
                                <td colspan="3" align="center" style="color: #ffd700; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 6px 4px 8px 4px; line-height: 1.2;">Images</td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 12px 16px;">
                          <div style="color: #ffd700; font-size: 17px; font-weight: 800; margin-bottom: 6px;">3. Product Images</div>
                          <p style="color: #f1f5f9; font-size: 15px; line-height: 1.6; margin: 0;">Drag and drop up to 5 clear photos of your product. High-quality visuals increase buyer engagement by up to 80%!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 40px 25px 40px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#ffd700" style="border-radius: 99px;">
                    <a href="https://www.coretradeglobal.com/product/new" target="_blank" class="btn-cta" style="display: inline-block; padding: 16px 36px; font-size: 18px; font-weight: 700; color: #0f1b2b; text-decoration: none; border-radius: 99px; background-color: #ffd700;">Upload Your First Product &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 215, 0, 0.03); border: 1px dashed rgba(255, 215, 0, 0.35); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <h4 style="color: #ffd700; font-size: 15px; font-weight: 800; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">&#9889; Have multiple products? Upload in bulk!</h4>
                    <p style="color: #e2e8f0; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">If you have a large inventory, you don't need to add them one by one. You can upload all your products at once via CSV in a few simple steps:</p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td valign="top" width="20" style="color: #ffd700; font-size: 13px; line-height: 1.5; font-weight: bold;">1.</td>
                        <td style="color: #f1f5f9; font-size: 13px; line-height: 1.5; padding-bottom: 4px;">Go to the <strong style="color: #ffffff;">MY PROFILE</strong> page.</td>
                      </tr>
                      <tr>
                        <td valign="top" width="20" style="color: #ffd700; font-size: 13px; line-height: 1.5; font-weight: bold;">2.</td>
                        <td style="color: #f1f5f9; font-size: 13px; line-height: 1.5; padding-bottom: 4px;">Scroll to the bulk upload assistant and click <strong style="color: #ffd700;">Download CSV Template</strong>.</td>
                      </tr>
                      <tr>
                        <td valign="top" width="20" style="color: #ffd700; font-size: 13px; line-height: 1.5; font-weight: bold;">3.</td>
                        <td style="color: #f1f5f9; font-size: 13px; line-height: 1.5;">Fill out the template with your product details and upload the file back!</td>
                      </tr>
                    </table>
                    <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px; color: #ffd700; font-size: 12px; line-height: 1.45;">
                      <strong>&#128161; We can help you!</strong> If you prefer, simply reply to this email with your catalog file (Excel or PDF), and our support team will handle the uploading and optimization for you&mdash;completely free.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 20px 40px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; text-align: center;">Explore the Platform</div>
              <table border="0" cellpadding="0" cellspacing="0" class="explore-menu" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/products" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Browse Products</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/requests" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Browse RFQs</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/about-us" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">About Us</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/faq" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">FAQ</a></td>
                  <td class="menu-bullet" style="color: #64748b; font-size: 13px;">&bull;</td>
                  <td class="menu-item" style="padding: 0 8px;"><a href="https://www.coretradeglobal.com/fairs" target="_blank" style="color: #ffd700; text-decoration: none; font-size: 13px; font-weight: 600;">Trade Fairs</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; text-align: center;">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <a href="https://linkedin.com/company/coretradeglobal" target="_blank" style="color: #94a3b8; text-decoration: none;">
                <img src="https://img.icons8.com/ios-filled/50/94a3b8/linkedin.png" alt="LinkedIn" width="20" style="display: inline-block; width: 20px; height: auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 15px; color: #ffd700; font-size: 16px;">
              <a href="mailto:info@coretradeglobal.com" style="color: #ffd700; text-decoration: none; font-weight: 500;">info@coretradeglobal.com</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 15px 20px; color: #64748b; font-size: 14px; line-height: 1.5;">You are receiving this email because you signed up for CoreTradeGlobal.</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px; line-height: 1.5; padding: 0 20px;">
              &copy; 2026 CoreTradeGlobal Inc. All rights reserved.
              <br /><br />
              <a href="https://coretradeglobal.com/privacy-policy" target="_blank" style="color: #64748b; text-decoration: underline;">Privacy Policy</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://coretradeglobal.com/terms" target="_blank" style="color: #64748b; text-decoration: underline;">Terms of Service</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a welcome email via Resend. Non-blocking — failure does not fail the CF.
 */
async function sendWelcomeEmail(to, displayName, userID) {
  const resend = getResend();
  if (!resend) {
    console.warn('sendWelcomeEmail: RESEND_API_KEY not set, skipping email.');
    return;
  }
  try {
    await resend.emails.send({
      from: 'CoreTradeGlobal <noreply@coretradeglobal.com>',
      to,
      subject: 'Welcome to CoreTradeGlobal!',
      html: buildWelcomeEmailHtml(displayName, userID),
    });
    console.log(`sendWelcomeEmail: sent welcome to ${to}`);
  } catch (err) {
    console.error(`sendWelcomeEmail: failed to send to ${to}:`, err);
  }
}

/**
 * Send the 24-hour "Upload Your Products" reminder via Resend.
 * Non-blocking — failure does not fail the CF.
 */
async function sendProductUploadEmail(to, displayName) {
  const resend = getResend();
  if (!resend) {
    console.warn('sendProductUploadEmail: RESEND_API_KEY not set, skipping email.');
    return;
  }
  try {
    await resend.emails.send({
      from: 'CoreTradeGlobal <noreply@coretradeglobal.com>',
      to,
      subject: 'Upload your products and start receiving quotes',
      html: buildProductUploadEmailHtml(displayName),
    });
    console.log(`sendProductUploadEmail: sent to ${to}`);
  } catch (err) {
    console.error(`sendProductUploadEmail: failed to send to ${to}:`, err);
  }
}

/**
 * Send an invite email via Resend. Non-blocking — failure does not fail the CF.
 */
async function sendInviteEmail(to, name, role, signInLink) {
  const resend = getResend();
  if (!resend) {
    console.warn('sendInviteEmail: RESEND_API_KEY not set, skipping email.');
    return;
  }
  const roleName = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  try {
    await resend.emails.send({
      from: 'CoreTradeGlobal <noreply@coretradeglobal.com>',
      to,
      subject: `You're invited to CoreTradeGlobal as ${roleName}`,
      html: buildInviteEmailHtml(name, role, signInLink),
    });
    console.log(`sendInviteEmail: sent invite to ${to} (${role})`);
  } catch (err) {
    console.error(`sendInviteEmail: failed to send to ${to}:`, err);
  }
}

/**
 * Invite User (Admin only)
 *
 * Creates a Firebase Auth user with a specific role, sets custom claims,
 * creates the Firestore user doc and invite doc, and generates a sign-in link.
 *
 * Note: The invites/{inviteId} document uses `expireAt` as the TTL field.
 * Configure TTL policy in Firebase Console:
 *   Collection: invites, Field: expireAt
 *
 * @param {Object} data - { email, role, name, company }
 * @returns {Promise<{ success: boolean, uid: string }>}
 */
exports.inviteUser = onCall(
  async (request) => {
    const { email, role, name, company } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can invite users
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can invite users.');
    }

    // Validate role — only inviteable roles allowed
    if (!VALID_INVITE_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${VALID_INVITE_ROLES.join(', ')}`
      );
    }

    if (!email || !role || !name) {
      throw new HttpsError('invalid-argument', 'email, role, and name are required.');
    }

    let newUser;

    try {
      // Create the Firebase Auth user
      newUser = await admin.auth().createUser({
        email,
        displayName: name,
        emailVerified: false,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'A user with this email already exists.');
      }
      console.error('Error creating user:', error);
      throw new HttpsError('internal', `Failed to create user: ${error.message}`);
    }

    const uid = newUser.uid;
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    try {
      // Set custom claims — role is the single source of truth
      await admin.auth().setCustomUserClaims(uid, { role });

      // Create Firestore user document
      await db.collection('users').doc(uid).set({
        email,
        displayName: name,
        companyName: company || null,
        role,
        inviteStatus: 'pending',
        invitedBy: auth.uid,
        invitedAt: now,
        createdAt: now,
        emailVerified: false,
        adminApproved: true,
      });

      // Generate sign-in link for onboarding
      // generateSignInWithEmailLink returns a link through __/auth/action which
      // doesn't handle mode=signIn redirects. Reconstruct as a direct app link
      // so the onboarding page can call signInWithEmailLink directly.
      const rawLink = await admin.auth().generateSignInWithEmailLink(email, {
        url: `${APP_URL}/onboarding?uid=${uid}`,
        handleCodeInApp: true,
      });
      const parsedLink = new URL(rawLink);
      const signInLink = `${APP_URL}/onboarding?uid=${uid}&mode=${parsedLink.searchParams.get('mode')}&oobCode=${parsedLink.searchParams.get('oobCode')}&apiKey=${parsedLink.searchParams.get('apiKey')}&lang=${parsedLink.searchParams.get('lang') || 'en'}`;

      // Create invite document with TTL (expireAt = TTL field for Firebase Console TTL policy)
      await db.collection('invites').doc(uid).set({
        email,
        role,
        name,
        company: company || null,
        status: 'pending',
        invitedBy: auth.uid,
        invitedAt: now,
        expiresAt,
        expireAt: expiresAt, // TTL field — configure in Firebase Console: Collection=invites, Field=expireAt
        signInLink, // Stored for resend capability
      });

      // Send invite email via Resend (non-blocking)
      await sendInviteEmail(email, name, role, signInLink);

      console.log(`Invited user ${uid} (${email}) with role ${role}`);

      return { success: true, uid };
    } catch (error) {
      // Attempt cleanup of partially-created user on failure
      try {
        await admin.auth().deleteUser(uid);
      } catch (_) { /* best-effort cleanup */ }
      console.error('Error during invite setup:', error);
      throw new HttpsError('internal', `Failed to complete invite: ${error.message}`);
    }
  }
);

/**
 * Resend Invite (Admin only)
 *
 * Regenerates the sign-in link for an existing invite (pending or expired).
 * Resets the invite's expiresAt to 7 days from now and updates the signInLink.
 * Does NOT recreate the Auth user — they already exist from the initial invite.
 *
 * @param {Object} data - { email, role, name, company }
 * @returns {Promise<{ success: boolean, uid: string }>}
 */
exports.resendInvite = onCall(
  async (request) => {
    const { email, role, name, company } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can resend invites.');
    }

    if (!email || !role) {
      throw new HttpsError('invalid-argument', 'email and role are required.');
    }

    if (!VALID_INVITE_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${VALID_INVITE_ROLES.join(', ')}`
      );
    }

    try {
      // Look up existing Auth user by email
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', `No invited user found with email: ${email}`);
        }
        throw err;
      }

      const uid = userRecord.uid;
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      );

      // Regenerate sign-in link (reconstruct as direct app link like inviteUser)
      const rawLink = await admin.auth().generateSignInWithEmailLink(email, {
        url: `${APP_URL}/onboarding?uid=${uid}`,
        handleCodeInApp: true,
      });
      const parsedLink = new URL(rawLink);
      const signInLink = `${APP_URL}/onboarding?uid=${uid}&mode=${parsedLink.searchParams.get('mode')}&oobCode=${parsedLink.searchParams.get('oobCode')}&apiKey=${parsedLink.searchParams.get('apiKey')}&lang=${parsedLink.searchParams.get('lang') || 'en'}`;

      const displayName = name || userRecord.displayName || email;

      // Update the invite doc: new expiry + new sign-in link
      await db.collection('invites').doc(uid).update({
        status: 'pending',
        expiresAt,
        expireAt: expiresAt,
        signInLink,
        resentAt: now,
        resentBy: auth.uid,
        name: displayName,
        company: company || null,
      });

      // Send invite email via Resend (non-blocking)
      await sendInviteEmail(email, displayName, role, signInLink);

      console.log(`Resent invite for ${uid} (${email}) with role ${role}`);

      return { success: true, uid };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error resending invite:', error);
      throw new HttpsError('internal', `Failed to resend invite: ${error.message}`);
    }
  }
);

/**
 * Set User Role (Admin only)
 *
 * Atomically updates a user's custom claims and their Firestore users document.
 * This replaces direct Firestore writes for role changes (e.g., handleToggleAdmin).
 *
 * @param {Object} data - { userId, role }
 * @returns {Promise<{ success: boolean }>}
 */
exports.setUserRole = onCall(
  async (request) => {
    const { userId, role } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can change roles
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can change user roles.');
    }

    // Validate role — all 5 roles can be assigned by admin
    if (!ROLE_VALUES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role. Must be one of: ${ROLE_VALUES.join(', ')}`
      );
    }

    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required.');
    }

    // Cannot change your own role (self-demotion guard)
    if (auth.uid === userId) {
      throw new HttpsError('invalid-argument', 'You cannot change your own role.');
    }

    try {
      // Update custom claims — role is enforced via JWT, not Firestore reads
      await admin.auth().setCustomUserClaims(userId, { role });

      // Update Firestore for display/query purposes
      await db.collection('users').doc(userId).update({
        role,
        updatedAt: Timestamp.now(),
      });

      console.log(`Set role ${role} for user ${userId} (by admin ${auth.uid})`);

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`Error setting role for user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to set user role: ${error.message}`);
    }
  }
);

/**
 * Set Role Claim on Registration (Self-registration for providers)
 *
 * Callable by the newly-registered user themselves.
 * Only logistics_provider and insurance_provider roles are allowed — members
 * do not need a custom claim set at registration time.
 *
 * Security: verifies the requested role matches the role field on the Firestore
 * user doc (written server-side during registration) to prevent claim escalation.
 *
 * @param {Object} data - { role: 'logistics_provider' | 'insurance_provider' }
 * @returns {{ success: true }}
 */
exports.setRoleClaimOnRegistration = onCall(
  async (request) => {
    const { role } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const uid = auth.uid;

    // Only provider roles are eligible — members get 'member' as default
    const PROVIDER_ROLES = [ROLES.LOGISTICS_PROVIDER, ROLES.INSURANCE_PROVIDER];
    if (!PROVIDER_ROLES.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid role for self-registration. Must be one of: ${PROVIDER_ROLES.join(', ')}`
      );
    }

    // Verify the Firestore user doc has the matching role (prevents claim escalation)
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User document not found.');
    }

    const firestoreRole = userDoc.data().role;
    if (firestoreRole !== role) {
      throw new HttpsError(
        'permission-denied',
        'Requested role does not match the registered user role.'
      );
    }

    try {
      await admin.auth().setCustomUserClaims(uid, { role });
      console.log(`setRoleClaimOnRegistration: set claim ${role} for user ${uid}`);
      return { success: true };
    } catch (error) {
      console.error(`setRoleClaimOnRegistration: failed for user ${uid}:`, error);
      throw new HttpsError('internal', `Failed to set role claim: ${error.message}`);
    }
  }
);

/**
 * Migrate Existing Users (Admin only)
 *
 * One-time migration function for bootstrapping existing accounts.
 * Sets role='member' custom claim for all users without a role claim.
 * Exception: if a user has role='admin' in Firestore, sets claim to 'admin'.
 *
 * Run once after deploying the role system. Safe to run multiple times
 * (skips users who already have a role claim set).
 *
 * @returns {Promise<{ migrated: number, skipped: number }>}
 */
exports.migrateExistingUsers = onCall(
  async (request) => {
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can run migration
    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can run user migration.');
    }

    let migrated = 0;
    let skipped = 0;
    let pageToken;

    try {
      do {
        // List users in batches of 1000 (Firebase Auth max)
        const listResult = await admin.auth().listUsers(1000, pageToken);

        for (const userRecord of listResult.users) {
          const claims = userRecord.customClaims || {};

          // Skip users who already have a role claim
          if (claims.role !== undefined) {
            skipped++;
            continue;
          }

          // Check Firestore for existing admin role (legacy accounts)
          let roleToSet = 'member';
          try {
            const userDoc = await db.collection('users').doc(userRecord.uid).get();
            if (userDoc.exists && userDoc.data().role === 'admin') {
              roleToSet = 'admin';
            }
          } catch (_) { /* if Firestore read fails, default to member */ }

          await admin.auth().setCustomUserClaims(userRecord.uid, { role: roleToSet });
          migrated++;

          console.log(`Migrated user ${userRecord.uid}: set role=${roleToSet}`);
        }

        pageToken = listResult.pageToken;
      } while (pageToken);

      console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);

      return { migrated, skipped };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Error during user migration:', error);
      throw new HttpsError('internal', `Migration failed: ${error.message}`);
    }
  }
);

/**
 * Soft Delete User Account (User self-delete)
 *
 * Marks user as deleted with 15-day recovery period
 * User can recover their account within 15 days
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.softDeleteUser = onCall(
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only user can soft-delete their own account
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'You can only delete your own account.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      // Calculate recovery deadline (15 days from now)
      const now = Timestamp.now();
      const recoveryDeadline = Timestamp.fromDate(
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      );

      // Update user document with soft delete flags
      await userRef.update({
        isDeleted: true,
        deletedAt: now,
        deletionType: 'self',
        canRecoverUntil: recoveryDeadline,
        updatedAt: now,
      });

      console.log(`🗑️ User ${userId} soft-deleted, can recover until ${recoveryDeadline.toDate()}`);

      return {
        success: true,
        message: 'Your account has been scheduled for deletion. You can recover it within 15 days.',
        canRecoverUntil: recoveryDeadline.toDate().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error soft-deleting user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to delete account: ${error.message}`);
    }
  }
);

/**
 * Recover User Account
 *
 * Allows user to recover their self-deleted account within 15 days
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.recoverAccount = onCall(
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'You can only recover your own account.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      // Check if account is deleted
      if (!userData.isDeleted) {
        throw new HttpsError('failed-precondition', 'Account is not deleted.');
      }

      // Check if it's a self-delete (not admin ban)
      if (userData.deletionType !== 'self') {
        throw new HttpsError('permission-denied', 'This account was banned by an administrator. Please contact support.');
      }

      // Check if recovery period has expired
      const now = new Date();
      const recoveryDeadline = userData.canRecoverUntil?.toDate();

      if (recoveryDeadline && now > recoveryDeadline) {
        throw new HttpsError('deadline-exceeded', 'Recovery period has expired. Your account can no longer be recovered.');
      }

      // Recover the account
      await userRef.update({
        isDeleted: false,
        deletedAt: FieldValue.delete(),
        deletionType: FieldValue.delete(),
        canRecoverUntil: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ User ${userId} recovered their account`);

      return {
        success: true,
        message: 'Your account has been recovered successfully!',
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error recovering user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to recover account: ${error.message}`);
    }
  }
);

/**
 * Ban User (Admin only)
 *
 * Permanently bans a user account (can be unbanned by admin)
 *
 * @param {Object} data - { userId: string, reason?: string }
 * @returns {Promise<Object>} - Success message
 */
exports.banUser = onCall(
  async (request) => {
    const { userId, reason } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can ban users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only administrators can ban users.');
    }

    // Cannot ban yourself
    if (auth.uid === userId) {
      throw new HttpsError('invalid-argument', 'You cannot ban yourself.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      // Cannot ban another admin
      if (userData.role === 'admin') {
        throw new HttpsError('permission-denied', 'Cannot ban another administrator.');
      }

      const now = Timestamp.now();

      // Update user document with ban flags
      await userRef.update({
        isDeleted: true,
        deletedAt: now,
        deletionType: 'admin_ban',
        banReason: reason || 'Violation of terms of service',
        bannedBy: auth.uid,
        updatedAt: now,
        // Remove recovery fields if they exist from previous self-delete
        canRecoverUntil: FieldValue.delete(),
      });

      console.log(`🚫 User ${userId} banned by admin ${auth.uid}. Reason: ${reason || 'Not specified'}`);

      return {
        success: true,
        message: 'User has been banned successfully.',
        userId: userId,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error banning user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to ban user: ${error.message}`);
    }
  }
);

/**
 * Unban User (Admin only)
 *
 * Restores a banned user account
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.unbanUser = onCall(
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    // Only admins can unban users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only administrators can unban users.');
    }

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
      }

      const userData = userDoc.data();

      if (!userData.isDeleted) {
        throw new HttpsError('failed-precondition', 'User is not banned.');
      }

      // Restore the account
      await userRef.update({
        isDeleted: false,
        deletedAt: FieldValue.delete(),
        deletionType: FieldValue.delete(),
        banReason: FieldValue.delete(),
        bannedBy: FieldValue.delete(),
        canRecoverUntil: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ User ${userId} unbanned by admin ${auth.uid}`);

      return {
        success: true,
        message: 'User has been unbanned successfully.',
        userId: userId,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`❌ Error unbanning user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to unban user: ${error.message}`);
    }
  }
);

/**
 * Reset User 2FA (Admin only)
 *
 * Removes all TOTP MFA enrollments and backup codes for a user.
 * Used when a user loses their authenticator device and has no backup codes.
 *
 * @param {Object} data - { userId: string }
 * @returns {Promise<Object>} - Success message
 */
exports.resetUser2FA = onCall(
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const adminCheck = await isUserAdmin(auth.uid);
    if (!adminCheck) {
      throw new HttpsError('permission-denied', 'Only administrators can reset 2FA.');
    }

    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required.');
    }

    try {
      // Get user record to find enrolled MFA factors
      const userRecord = await admin.auth().getUser(userId);
      const enrolledFactors = userRecord.multiFactor?.enrolledFactors || [];

      if (enrolledFactors.length === 0) {
        throw new HttpsError('failed-precondition', 'This user does not have 2FA enabled.');
      }

      // Unenroll all MFA factors
      await admin.auth().getUser(userId).then(async () => {
        // Firebase Admin SDK: update user to remove all enrolled factors
        await admin.auth().updateUser(userId, {
          multiFactor: {
            enrolledFactors: [],
          },
        });
      });

      // Delete backup codes from Firestore
      try {
        await db.collection('users').doc(userId).collection('security').doc('backupCodes').delete();
      } catch {
        // Non-critical — may not exist
      }

      console.log(`Admin ${auth.uid} reset 2FA for user ${userId}`);

      return {
        success: true,
        message: `2FA has been reset. ${enrolledFactors.length} factor(s) removed.`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`Error resetting 2FA for user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to reset 2FA: ${error.message}`);
    }
  }
);

/**
 * Hard Delete User Account (Permanent)
 *
 * Completely removes user from both Firebase Auth and Firestore
 * Can be called by admin to permanently delete a user
 * Also used by scheduled cleanup for expired self-deleted accounts
 *
 * @param {Object} data - { userId: string }
 * @param {Object} context - Firebase auth context
 * @returns {Promise<Object>} - Success message
 */
exports.deleteUser = onCall(
  async (request) => {
    const { userId } = request.data;
    const auth = request.auth;

    // Check if user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to delete an account.');
    }

    // Only admins can hard delete users - check Firestore
    const isAdmin = await isUserAdmin(auth.uid);

    if (!isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only administrators can permanently delete accounts. Use soft delete for your own account.'
      );
    }

    try {
      console.log(`🗑️  Hard deleting user account: ${userId}`);

      // 1. Delete user's products
      const productsSnapshot = await db.collection('products').where('userId', '==', userId).get();
      const productDeletePromises = productsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(productDeletePromises);
      console.log(`✅ Deleted ${productsSnapshot.size} products`);

      // 2. Delete user's requests
      const requestsSnapshot = await db.collection('requests').where('userId', '==', userId).get();
      const requestDeletePromises = requestsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(requestDeletePromises);
      console.log(`✅ Deleted ${requestsSnapshot.size} requests`);

      // 3. Delete user's conversations and messages
      const conversationsSnapshot = await db.collection('conversations')
        .where('participants', 'array-contains', userId)
        .get();

      for (const convDoc of conversationsSnapshot.docs) {
        // Delete all messages in the conversation
        const messagesSnapshot = await convDoc.ref.collection('messages').get();
        const messageDeletePromises = messagesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(messageDeletePromises);
        // Delete the conversation
        await convDoc.ref.delete();
      }
      console.log(`✅ Deleted ${conversationsSnapshot.size} conversations`);

      // 4. Delete user's storage files (profile photos, product images)
      try {
        const bucket = admin.storage().bucket();
        await bucket.deleteFiles({ prefix: `users/${userId}/` });
        await bucket.deleteFiles({ prefix: `products/${userId}/` });
        console.log(`✅ Deleted storage files`);
      } catch (storageError) {
        // Storage might not have files, continue anyway
        console.log(`⚠️ Storage cleanup: ${storageError.message}`);
      }

      // 5. Delete user document from Firestore
      await db.collection('users').doc(userId).delete();
      console.log(`✅ Deleted from Firestore: ${userId}`);

      // 6. Delete user from Firebase Authentication (if exists)
      try {
        await admin.auth().deleteUser(userId);
        console.log(`✅ Deleted from Firebase Auth: ${userId}`);
      } catch (authError) {
        // User might not exist in Auth (already deleted or never created)
        if (authError.code === 'auth/user-not-found') {
          console.log(`⚠️ User not found in Firebase Auth (already deleted or orphaned document): ${userId}`);
        } else {
          throw authError;
        }
      }

      return {
        success: true,
        message: 'User account and all related data have been permanently deleted.',
        userId: userId,
        deletedData: {
          products: productsSnapshot.size,
          requests: requestsSnapshot.size,
          conversations: conversationsSnapshot.size,
        }
      };
    } catch (error) {
      console.error(`❌ Error deleting user ${userId}:`, error);
      throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
    }
  }
);

/**
 * Send Push Notification on New Message
 *
 * Triggers when a new message is created in a conversation
 * Sends push notification to all recipients (excluding sender)
 */
exports.sendMessageNotification = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return null;
    }

    const message = snapshot.data();
    const { conversationId } = event.params;

    console.log(`📨 New message in conversation ${conversationId}`);

    try {
      // Get the conversation to find participants
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();

      if (!conversationDoc.exists) {
        console.log('Conversation not found');
        return null;
      }

      const conversation = conversationDoc.data();
      const participants = conversation.participants || [];

      // Get recipients (exclude the sender)
      const recipients = participants.filter(uid => uid !== message.senderId);

      if (recipients.length === 0) {
        console.log('No recipients to notify');
        return null;
      }

      // Collect FCM tokens and handle per-recipient email throttle
      const tokens = [];

      for (const recipientId of recipients) {
        const userDoc = await db.collection('users').doc(recipientId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          // Check notification preferences — default to true if not set
          const pushEnabled = userData.preferences?.messages?.push !== false;

          if (userData.fcmToken && pushEnabled) {
            tokens.push(userData.fcmToken);
          } else if (userData.fcmToken && !pushEnabled) {
            console.log(`📵 Push disabled for messages by user ${recipientId} — skipping`);
          }

          // --- Email throttle: max 1 "new messages" email per user per day across all conversations.
          // Race-safe enough for a daily throttle — rare double-send is acceptable. ---
          try {
            const emailEnabled = userData.preferences?.messages?.email !== false;
            if (emailEnabled && userData.email) {
              const lastSent = userData.lastMessageEmailSentAt;
              const throttled = lastSent && (Date.now() - lastSent.toMillis() < 86400000);
              if (throttled) {
                console.log(`📧 Message email throttled for ${recipientId} — last sent within 24h`);
              } else {
                const messagesUrl = `${APP_URL}/messages/${conversationId}`;
                const emailHtml = buildBrandedEmailHtml(
                  '<p style="margin:0 0 16px 0;">You have unread messages. Visit CoreTradeGlobal to read and reply.</p>',
                  'View Messages',
                  messagesUrl
                );
                await sendDealEmail(userData.email, 'You have new messages on CoreTradeGlobal', emailHtml);
                await db.collection('users').doc(recipientId).update({
                  lastMessageEmailSentAt: Timestamp.now(),
                });
                console.log(`📧 Message email sent to ${recipientId}`);
              }
            } else if (!emailEnabled) {
              console.log(`📧 Email disabled for messages by ${recipientId} — skipping email`);
            }
          } catch (emailErr) {
            // Non-blocking — email failure must not fail the CF
            console.error(`sendMessageNotification: email error for ${recipientId}:`, emailErr);
          }
        }
      }

      if (tokens.length === 0) {
        console.log('No eligible FCM tokens found for recipients');
        return null;
      }

      console.log(`📱 Sending notification to ${tokens.length} device(s)`);

      // Prepare DATA-ONLY payload (no 'notification' field)
      // This prevents FCM from auto-showing notifications
      // The service worker/client will handle display
      const notificationPayload = {
        data: {
          conversationId: conversationId,
          messageId: event.params.messageId,
          senderId: message.senderId,
          senderName: message.senderName || 'New Message',
          messageContent: message.content.length > 100
            ? message.content.substring(0, 97) + '...'
            : message.content,
          type: 'new_message',
          click_action: `/messages/${conversationId}`,
        },
        webpush: {
          fcmOptions: {
            link: `/messages/${conversationId}`,
          },
        },
      };

      // Send to all tokens
      const sendPromises = tokens.map(token =>
        messaging.send({
          ...notificationPayload,
          token: token,
        }).catch(error => {
          console.error(`Error sending to token ${token}:`, error.code);
          // If token is invalid, remove it from user's document
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            return db.collection('users')
              .where('fcmToken', '==', token)
              .get()
              .then(snapshot => {
                snapshot.forEach(doc => {
                  doc.ref.update({ fcmToken: FieldValue.delete() });
                });
              });
          }
          return null;
        })
      );

      await Promise.all(sendPromises);
      console.log('✅ Notifications sent successfully');

      return null;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  }
);

/**
 * Send welcome email when a new user self-registers.
 *
 * Triggered on user document creation. Skips invited users (providers/lawyers)
 * since they receive a separate invite email. Only self-registered members get
 * the welcome email. Non-blocking — email failure does not affect registration.
 */
exports.sendWelcomeOnRegister = onDocumentCreated(
  'users/{uid}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const userData = snapshot.data();
    const uid = event.params.uid;

    // Skip invited users — they get an invite email instead
    if (userData.invitedBy || userData.inviteStatus) {
      console.log(`sendWelcomeOnRegister: skipping invited user ${uid}`);
      return null;
    }

    const email = userData.email;
    if (!email) {
      console.log(`sendWelcomeOnRegister: no email for user ${uid}, skipping`);
      return null;
    }

    const displayName = userData.displayName || userData.firstName || 'there';
    await sendWelcomeEmail(email, displayName, uid);

    // Mirror the new user into Resend so broadcasts (dashboard-scheduled
    // newsletters, campaigns) can reach them later.
    //
    // AWAITED (not fire-and-forget): GCF v2 tears down containers as
    // soon as the trigger promise resolves, so a dangling
    // resend.contacts.create() request can be cancelled mid-flight —
    // that's exactly what we saw during rollout, function metrics
    // showed 3 invocations with zero errors while the Resend audience
    // stayed at zero contacts. A ~200 ms delay per trigger is fine.
    //
    // `RESEND_AUDIENCE_ID` is optional: if set we push into that
    // specific audience/segment; if unset the contact still lands in
    // the workspace's default audience so no one is lost.
    try {
      const resendClient = getResend();
      if (resendClient) {
        const contactPayload = {
          email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          unsubscribed: false,
        };
        if (process.env.RESEND_AUDIENCE_ID) {
          contactPayload.audienceId = process.env.RESEND_AUDIENCE_ID;
        }
        const result = await resendClient.contacts.create(contactPayload);
        if (result?.error) {
          const status = result.error?.statusCode ?? result.error?.status;
          if (status !== 409) {
            console.warn(`sendWelcomeOnRegister: Resend contacts.create returned error for ${email}:`, result.error);
          }
        } else {
          console.log(`sendWelcomeOnRegister: Resend contact created for ${email} (id=${result?.data?.id ?? 'unknown'})`);
        }
      }
    } catch (err) {
      const status = err?.statusCode ?? err?.status;
      if (status !== 409) {
        console.warn(`sendWelcomeOnRegister: Resend contacts.create threw for ${email}:`, err.message || err);
      }
    }

    // Seed an in-app notification prompting the user to verify their email.
    // Skip for OAuth users (Google/LinkedIn) whose email is already verified.
    if (!userData.emailVerified) {
      try {
        await db.collection('users').doc(uid).collection('notifications').add({
          type: 'verify_email',
          title: 'Verify your email',
          body: 'Please check your mailbox and verify your email address.',
          isRead: false,
          createdAt: Timestamp.now(),
          link: '/verify-email',
        });
      } catch (err) {
        console.error(`sendWelcomeOnRegister: failed to create verify-email notification for ${uid}:`, err);
      }
    }

    // Fan out an "awaiting approval" notification to every admin so they
    // can review + approve the new user. Previously this ran client-side
    // during registration (querying `where role == admin` + one write per
    // admin), which added noticeable latency to the register-to-homepage
    // hop and also exposed the admin roster to any authenticated client.
    // Moving it here removes both problems.
    try {
      const companyName = userData.companyName || '—';
      const adminsSnap = await db
        .collection('users')
        .where('role', '==', 'admin')
        .limit(50)
        .get();
      if (!adminsSnap.empty) {
        const batch = db.batch();
        const notification = {
          type: 'new_user_approval',
          title: 'New User Awaiting Approval',
          body: `${displayName} from "${companyName}" has registered and needs approval`,
          data: {
            userId: uid,
            userName: displayName,
            companyName,
            email,
          },
          isRead: false,
          createdAt: Timestamp.now(),
        };
        adminsSnap.docs.forEach((adminDoc) => {
          const ref = db
            .collection('users')
            .doc(adminDoc.id)
            .collection('notifications')
            .doc();
          batch.set(ref, notification);
        });
        await batch.commit();
      }
    } catch (err) {
      console.error(`sendWelcomeOnRegister: failed to fan out admin approval notifications for ${uid}:`, err);
    }

    return null;
  }
);

/**
 * sendProductUploadReminder
 *
 * Hourly cron. Sends the "Upload Your Products" nudge exactly 24 hours
 * after a user registered, once per user.
 *
 * Selection window: users whose `createdAt` is between
 * PRODUCT_UPLOAD_REMINDER_BASELINE (feature-launch cutoff — protects
 * legacy accounts from a mass-blast) and (now - 24h). Second-pass
 * client-side filtering skips:
 *   - users we already reminded (`productUploadReminderSentAt` set)
 *   - invited users (`invitedBy` / `inviteStatus` — they have a
 *     different onboarding email)
 *   - deleted / suspended accounts
 *   - accounts without an email address
 * After a successful send the user doc is stamped with
 * `productUploadReminderSentAt` so a subsequent tick can't re-send.
 *
 * Query note: two range constraints on `createdAt` need a single-field
 * ascending index (Firestore auto-provisions). No composite index
 * required.
 */
const PRODUCT_UPLOAD_REMINDER_BASELINE = new Date('2026-07-12T00:00:00Z');

exports.sendProductUploadReminder = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const cutoff24h = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const baseline = Timestamp.fromDate(PRODUCT_UPLOAD_REMINDER_BASELINE);

    try {
      const snap = await db.collection('users')
        .where('createdAt', '>=', baseline)
        .where('createdAt', '<=', cutoff24h)
        .orderBy('createdAt', 'asc')
        .limit(200)
        .get();

      if (snap.empty) {
        console.log('sendProductUploadReminder: no candidates.');
        return null;
      }

      let sent = 0;
      let skipped = 0;
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.productUploadReminderSentAt) { skipped++; continue; }
        if (data.invitedBy || data.inviteStatus) { skipped++; continue; }
        if (data.isDeleted === true || data.isSuspended === true) { skipped++; continue; }
        if (!data.email) { skipped++; continue; }

        const displayName = data.displayName || data.firstName || 'there';
        try {
          await sendProductUploadEmail(data.email, displayName);
          await doc.ref.update({ productUploadReminderSentAt: Timestamp.now() });
          sent++;
        } catch (err) {
          console.error(`sendProductUploadReminder: failed for ${doc.id}:`, err);
        }
      }
      console.log(`sendProductUploadReminder: sent=${sent}, skipped=${skipped}`);
    } catch (err) {
      console.error('sendProductUploadReminder: query/loop failed:', err);
      throw err;
    }

    return null;
  }
);

/**
 * syncUnsubscribeToResend
 *
 * When a user unsubscribes via our own endpoint (public API creates a
 * doc under `unsubscribes/{sha256-of-email}`), mirror the state into
 * Resend so broadcasts scheduled from the dashboard also honour the
 * opt-out and we don't get spam-reported.
 *
 * Runs on doc CREATE only — repeat unsubscribes idempotently re-write
 * the same doc so the trigger doesn't fire again, but a re-created doc
 * (rare) would still land here.
 */
exports.syncUnsubscribeToResend = onDocumentCreated(
  'unsubscribes/{docId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const data = snapshot.data();
    const email = data?.email || data?.emailLower;
    if (!email) {
      console.log('syncUnsubscribeToResend: no email in doc, skipping');
      return null;
    }

    const resendClient = getResend();
    if (!resendClient) {
      console.warn('syncUnsubscribeToResend: RESEND_API_KEY unset, skipping');
      return null;
    }

    // audienceId is optional — pushed only when set. See
    // sendWelcomeOnRegister for the same flex.
    const audienceId = process.env.RESEND_AUDIENCE_ID || null;

    try {
      const updatePayload = { email, unsubscribed: true };
      if (audienceId) updatePayload.audienceId = audienceId;
      await resendClient.contacts.update(updatePayload);
      console.log(`syncUnsubscribeToResend: marked ${email} as unsubscribed in Resend`);
    } catch (err) {
      // 404 = contact never existed in Resend (unsubscribed before we
      // ever emailed them). Create as pre-suppressed so future adds
      // still respect the opt-out.
      const status = err?.statusCode ?? err?.status;
      if (status === 404) {
        try {
          const createPayload = { email, unsubscribed: true };
          if (audienceId) createPayload.audienceId = audienceId;
          await resendClient.contacts.create(createPayload);
          console.log(`syncUnsubscribeToResend: pre-created ${email} as unsubscribed in Resend`);
        } catch (createErr) {
          console.warn(`syncUnsubscribeToResend: fallback create failed for ${email}:`, createErr.message || createErr);
        }
      } else {
        console.warn(`syncUnsubscribeToResend: update failed for ${email}:`, err.message || err);
      }
    }

    return null;
  }
);

/**
 * backfillResendContacts
 *
 * Admin-only, run-once helper to load every existing user into the
 * Resend Audience. Skips deleted / no-email records and swallows
 * duplicate-contact errors so re-runs are safe. Rate-limited at 10
 * req/sec to stay under Resend's default throughput.
 *
 * Invoke from a client while signed in as admin:
 *   httpsCallable(functions, 'backfillResendContacts')({ limit: 1000 })
 */
exports.backfillResendContacts = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!(await isUserAdmin(request.auth?.uid))) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }
    const resendClient = getResend();
    if (!resendClient) {
      throw new HttpsError('failed-precondition', 'RESEND_API_KEY is not set.');
    }

    const limit = Math.min(Math.max(parseInt(request.data?.limit, 10) || 1000, 1), 5000);
    // audienceId is optional. When unset the contact still lands in the
    // workspace's default audience — safe fallback for Resend accounts
    // whose UI no longer exposes a distinct Audience ID to grab.
    const audienceId = process.env.RESEND_AUDIENCE_ID || null;

    // Also honour our own unsubscribe list — anyone already opted out
    // should land in Resend as `unsubscribed: true`.
    let unsubscribedEmails = new Set();
    try {
      const unsubSnap = await db.collection('unsubscribes').limit(5000).get();
      unsubSnap.docs.forEach((d) => {
        const em = d.data()?.emailLower || d.data()?.email;
        if (em) unsubscribedEmails.add(String(em).toLowerCase());
      });
    } catch (err) {
      console.warn('backfillResendContacts: failed to load unsubscribes list, proceeding without it:', err.message);
    }

    const snap = await db.collection('users').limit(limit).get();
    let added = 0;
    let alreadyIn = 0;
    let skipped = 0;
    const errors = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      if (!d.email || d.isDeleted === true) {
        skipped++;
        continue;
      }
      const emailLower = String(d.email).toLowerCase();
      try {
        const payload = {
          email: d.email,
          firstName: d.firstName || null,
          lastName: d.lastName || null,
          unsubscribed: unsubscribedEmails.has(emailLower),
        };
        if (audienceId) payload.audienceId = audienceId;
        await resendClient.contacts.create(payload);
        added++;
      } catch (err) {
        const status = err?.statusCode ?? err?.status;
        if (status === 409) {
          alreadyIn++;
        } else {
          errors.push({ email: d.email, message: err.message || String(err) });
          console.warn(`backfillResendContacts: contacts.create failed for ${d.email}:`, err.message || err);
        }
      }
      // Rate-limit: ~10 req/sec.
      await new Promise((resolve) => setTimeout(resolve, 110));
    }

    const summary = { scanned: snap.size, added, alreadyIn, skipped, errorCount: errors.length };
    console.log('backfillResendContacts: done', summary);
    return { ...summary, errors: errors.slice(0, 10) };
  }
);

/**
 * Build the "New Advertising Inquiry" admin email HTML.
 *
 * Compact one-column card showing the inquiry summary + a CTA link into
 * the /admin dashboard's Ad Inquiries tab. Palette matches the other
 * transactional emails.
 */
function buildAdInquiryAdminEmailHtml(inquiry) {
  const esc = (v) => String(v ?? '').replace(/[<>]/g, '');
  const briefHtml = (inquiry.brief || '').trim()
    ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Brief</td></tr>
       <tr><td style="padding:0 0 12px 0;color:#f1f5f9;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(inquiry.brief).replace(/\n/g, '<br />')}</td></tr>`
    : '';
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Advertising Inquiry</title></head>
<body style="margin:0;padding:0;background-color:#0f1b2b;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f1b2b;">
  <tr><td align="center" style="padding:30px 10px 20px 10px;">
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#1a283b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <div style="color:#ffd700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">New Advertising Inquiry</div>
        <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 4px 0;line-height:1.35;">${esc(inquiry.company)}</h1>
        <p style="color:#94a3b8;font-size:14px;margin:0;">${esc(inquiry.package)}</p>
      </td></tr>
      <tr><td style="padding:8px 32px 24px 32px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Contact</td></tr>
          <tr><td style="padding:0 0 8px 0;color:#f1f5f9;font-size:15px;">${esc(inquiry.contactName)} &middot; <a href="mailto:${esc(inquiry.email)}" style="color:#ffd700;text-decoration:none;">${esc(inquiry.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Website</td></tr>
          <tr><td style="padding:0 0 8px 0;color:#f1f5f9;font-size:15px;"><a href="${esc(inquiry.website)}" target="_blank" style="color:#ffd700;text-decoration:none;">${esc(inquiry.website)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Campaign Window</td></tr>
          <tr><td style="padding:0 0 12px 0;color:#f1f5f9;font-size:15px;">${esc(inquiry.campaignMonth)} &middot; ${esc(inquiry.campaignWeek)}</td></tr>
          ${briefHtml}
        </table>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 28px 32px;">
        <a href="https://www.coretradeglobal.com/admin?tab=ad-inquiries" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#0f1b2b;text-decoration:none;border-radius:99px;background-color:#ffd700;">Review in Admin Dashboard &rarr;</a>
      </td></tr>
      <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid rgba(255,255,255,0.06);color:#64748b;font-size:12px;line-height:1.5;text-align:center;">
        Sent because you're an admin on CoreTradeGlobal.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * notifyAdminsOnAdInquiry
 *
 * Fires when a public inquiry lands in `adInquiries`. Fans out an
 * in-app notification (subcollection `users/{adminUid}/notifications`)
 * for each admin so the bell + admin dashboard both show it, and
 * emails every admin via Resend so nothing gets lost when they're
 * away from the app.
 */
exports.notifyAdminsOnAdInquiry = onDocumentCreated(
  'adInquiries/{inquiryId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    const inquiryId = event.params.inquiryId;
    const data = snapshot.data() || {};

    // In-app notification fan-out to every admin.
    try {
      const adminsSnap = await db.collection('users').where('role', '==', 'admin').limit(50).get();
      if (!adminsSnap.empty) {
        const batch = db.batch();
        const notification = {
          type: 'ad_inquiry',
          title: 'New Advertising Inquiry',
          body: `${data.company || 'A company'} inquired about ${data.package || 'an ad placement'}`,
          data: {
            inquiryId,
            company: data.company || null,
            email: data.email || null,
            package: data.package || null,
          },
          isRead: false,
          createdAt: Timestamp.now(),
          link: '/admin?tab=ad-inquiries',
        };
        adminsSnap.docs.forEach((adminDoc) => {
          const ref = db.collection('users').doc(adminDoc.id).collection('notifications').doc();
          batch.set(ref, notification);
        });
        await batch.commit();
      }
    } catch (err) {
      console.error(`notifyAdminsOnAdInquiry: in-app fan-out failed for ${inquiryId}:`, err);
    }

    // Email every admin via Resend (best-effort — Resend hiccup must
    // not block, admins still have the in-app notification).
    try {
      const resend = getResend();
      if (!resend) {
        console.warn('notifyAdminsOnAdInquiry: RESEND_API_KEY unset, skipping admin email.');
      } else {
        const adminsSnap = await db.collection('users').where('role', '==', 'admin').limit(50).get();
        const adminEmails = adminsSnap.docs
          .map((d) => d.data()?.email)
          .filter((e) => typeof e === 'string' && e.includes('@'));
        if (adminEmails.length > 0) {
          const html = buildAdInquiryAdminEmailHtml(data);
          const subject = `New Ad Inquiry: ${data.company || 'Unknown company'}`;
          // Resend caps `to` at 50 addresses per call — we're well under that.
          await resend.emails.send({
            from: 'CoreTradeGlobal <noreply@coretradeglobal.com>',
            to: adminEmails,
            subject,
            html,
            reply_to: data.email || undefined,
          });
          console.log(`notifyAdminsOnAdInquiry: emailed ${adminEmails.length} admin(s) for ${inquiryId}`);
        }
      }
    } catch (err) {
      console.error(`notifyAdminsOnAdInquiry: email fan-out failed for ${inquiryId}:`, err);
    }

    return null;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Deal Negotiation Constants (mirrored from src/core/constants/dealConstants.js)
// Cloud Functions are CommonJS — cannot import ESM from the Next.js app.
// ─────────────────────────────────────────────────────────────────────────────

const DEAL_STATUS = {
  NEGOTIATING: 'negotiating',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
  CONTRACT_APPROVED: 'contract_approved', // Both parties approved all contract clauses
  PROVIDERS_SELECTED: 'providers_selected', // Buyer confirmed insurance/logistics provider selections
  DELIVERED: 'delivered', // Logistics provider confirmed delivery — true terminal state
};

// Valid deal status transitions (mirrored from src/core/constants/dealConstants.js)
const VALID_DEAL_TRANSITIONS_CF = {
  negotiating: ['accepted', 'rejected', 'expired', 'withdrawn'],
  accepted: ['contract_approved'],
  contract_approved: ['providers_selected'],
  providers_selected: ['delivered'],
  delivered: [],
  rejected: [],
  expired: [],
  withdrawn: [],
};

// Shipment status constants (mirrored from src/core/constants/shipmentConstants.js)
const SHIPMENT_STATUS_CF = {
  PREPARING: 'preparing',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  AT_CUSTOMS: 'at_customs',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COVERAGE_ACTIVE: 'coverage_active',
};

const QUOTE_REQUEST_STATUS = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  DECLINED: 'declined',
  SELECTED: 'selected',
  NOT_SELECTED: 'not_selected',
};

const QUOTE_STATUS = {
  ACTIVE: 'active',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
  ACCEPTED: 'accepted',
};

const CONTRACT_STATUS = {
  PENDING: 'pending',
  BUYER_APPROVED: 'buyer_approved',
  SELLER_APPROVED: 'seller_approved',
  BOTH_APPROVED: 'both_approved',
};

const OFFER_STATUS = {
  OPEN: 'open',
  COUNTERED: 'countered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
};

const EXPIRY_DEFAULT_HOURS = 72;

// Legal engagement status constants (duplicated from src/core/constants/legalConstants.js)
// Cloud Functions are CommonJS — cannot import ESM from the Next.js app.
const ENGAGEMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DECLINED: 'declined',
};

// ─────────────────────────────────────────────────────────────────────────────
// Status History Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a status history entry to a deal document.
 *
 * Uses FieldValue.arrayUnion so concurrent calls are safe and idempotent.
 * Call this OUTSIDE transactions to prevent duplicate entries on retry.
 *
 * @param {string} dealId
 * @param {string} status - DEAL_STATUS value being recorded
 * @param {string} actorId - UID of the party who triggered the transition
 * @param {string} actorName - Display name of the actor
 * @param {string|null} note - Optional context note
 */
async function appendStatusHistory(dealId, status, actorId, actorName, note) {
  await db.collection('deals').doc(dealId).update({
    statusHistory: FieldValue.arrayUnion({
      status,
      timestamp: Timestamp.now(),
      actorId,
      actorName,
      note: note || '',
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Negotiation Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Deal
 *
 * Atomically creates a deal document and its initial offer in a single Firestore
 * transaction. Determines buyer/seller from product ownership.
 *
 * @param {Object} data - { conversationId, productId, initialOffer }
 *   initialOffer: { price, quantity, unit, currency, conversionRate?, incoterm,
 *                   namedPlace, deliveryDeadline, paymentTerms, insurancePreference,
 *                   notes?, expiryHours? }
 * @returns {Promise<{ success: boolean, dealId: string }>}
 */
exports.createDeal = onCall(async (request) => {
  const { conversationId, productId, initialOffer } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in to create a deal.');
  if (!productId || !initialOffer) {
    throw new HttpsError('invalid-argument', 'productId and initialOffer are required.');
  }
  if (!initialOffer.price || !initialOffer.quantity || !initialOffer.incoterm) {
    throw new HttpsError('invalid-argument', 'initialOffer must include price, quantity, and incoterm.');
  }

  // Fetch product to get seller ID and denormalized data
  const productDoc = await db.collection('products').doc(productId).get();
  if (!productDoc.exists) {
    throw new HttpsError('not-found', 'Product not found.');
  }
  const product = productDoc.data();
  const sellerId = product.userId;

  // Determine buyer/seller:
  // Product owner is always the seller.
  // If the initiator IS the seller, fetch the conversation to find the buyer.
  let buyerId;
  let actualSellerId = sellerId;

  if (uid === sellerId) {
    // Seller initiated — find buyer from conversation participants
    if (!conversationId) {
      throw new HttpsError('invalid-argument', 'conversationId is required when the seller initiates a deal.');
    }
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convDoc.exists) {
      throw new HttpsError('not-found', 'Conversation not found.');
    }
    const conv = convDoc.data();
    const participants = conv.participants || [];
    buyerId = participants.find((p) => p !== sellerId);
    if (!buyerId) {
      throw new HttpsError('failed-precondition', 'Could not determine buyer from conversation participants.');
    }
  } else {
    // Buyer initiated
    buyerId = uid;
  }

  const now = Timestamp.now();
  const expiryHours = initialOffer.expiryHours || EXPIRY_DEFAULT_HOURS;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + expiryHours * 60 * 60 * 1000)
  );

  const dealRef = db.collection('deals').doc(); // auto-ID
  const offerRef = dealRef.collection('offers').doc(); // auto-ID

  const initiatorRole = uid === actualSellerId ? 'seller' : 'buyer';

  // latestOfferSnapshot: denormalized subset of offer terms for the deals list page
  const latestOfferSnapshot = {
    price: initialOffer.price,
    quantity: initialOffer.quantity,
    unit: initialOffer.unit,
    currency: initialOffer.currency,
    incoterm: initialOffer.incoterm,
    namedPlace: initialOffer.namedPlace,
    estimatedTotal: initialOffer.price * initialOffer.quantity,
    expiresAt,
    submittedBy: uid,
  };

  await db.runTransaction(async (transaction) => {
    // Create the deal document
    transaction.set(dealRef, {
      buyerId,
      sellerId: actualSellerId,
      initiatedBy: uid,
      productId,
      productName: product.name || '',
      productImage: product.images?.[0] || null,
      productCategory: product.categoryName || null,
      conversationId: conversationId || null,
      status: DEAL_STATUS.NEGOTIATING,
      // After submitting, the OTHER party must respond first
      currentTurnUid: uid === actualSellerId ? buyerId : actualSellerId,
      round: 1,
      latestOfferSnapshot,
      createdAt: now,
      updatedAt: now,
    });

    // Create the initial offer document
    const { expiryHours: _expiryHours, ...offerTerms } = initialOffer;
    transaction.set(offerRef, {
      round: 1,
      submittedBy: uid,
      role: initiatorRole,
      ...offerTerms,
      conversionRate: initialOffer.conversionRate || null,
      notes: initialOffer.notes || null,
      attachments: [],
      status: OFFER_STATUS.OPEN,
      expiresAt,
      estimatedTotal: initialOffer.price * initialOffer.quantity,
      createdAt: now,
      updatedAt: now,
    });

    // Link deal to conversation metadata for persistent banner (only when the
    // deal has an associated conversation — direct "Start Deal" deals may not).
    if (conversationId) {
      const conversationRef = db.collection('conversations').doc(conversationId);
      transaction.update(conversationRef, {
        'metadata.dealId': dealRef.id,
        'metadata.dealStatus': DEAL_STATUS.NEGOTIATING,
      });
    }
  });

  // Note: system message is posted by onDealOfferCreated trigger (round === 1 = new_deal)
  // to avoid duplicate messages. Do NOT post system message here.

  console.log(`Deal created: ${dealRef.id} (buyer: ${buyerId}, seller: ${actualSellerId})`);
  return { success: true, dealId: dealRef.id };
});

/**
 * Submit Counter Offer
 *
 * Creates a new offer round in a deal. Enforces turn-based logic and
 * round number check to prevent stale concurrent writes.
 *
 * @param {Object} data - { dealId, offer, expectedRound }
 *   offer: { price, quantity, unit, currency, conversionRate?, incoterm,
 *             namedPlace, deliveryDeadline, paymentTerms, insurancePreference,
 *             notes?, expiryHours? }
 * @returns {Promise<{ success: boolean, dealId: string }>}
 */
exports.submitCounterOffer = onCall(async (request) => {
  const { dealId, offer, expectedRound } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offer) {
    throw new HttpsError('invalid-argument', 'dealId and offer are required.');
  }
  if (expectedRound === undefined || expectedRound === null) {
    throw new HttpsError('invalid-argument', 'expectedRound is required to prevent stale writes.');
  }

  try {
  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);

    // Find the open offer — query within transaction is not directly supported
    // so we fetch the deal first, then query the offers subcollection
    const dealSnap = await transaction.get(dealRef);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');

    const deal = dealSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only active negotiations can receive counter-offers.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (deal.round !== expectedRound) {
      throw new HttpsError(
        'aborted',
        'Deal has been updated since you last loaded it. Please refresh.'
      );
    }

    // Fetch all open offers to find the current one
    // (Admin SDK: we can query outside the transaction and then lock via get in transaction)
    const openOffersSnap = await dealRef
      .collection('offers')
      .where('status', '==', OFFER_STATUS.OPEN)
      .orderBy('round', 'desc')
      .limit(1)
      .get();

    if (openOffersSnap.empty) {
      throw new HttpsError('not-found', 'No open offer found for this deal.');
    }

    const latestOfferDoc = openOffersSnap.docs[0];
    const latestOfferRef = latestOfferDoc.ref;

    // Lock the offer doc inside the transaction
    const lockedOfferSnap = await transaction.get(latestOfferRef);
    if (!lockedOfferSnap.exists) {
      throw new HttpsError('not-found', 'Offer document not found.');
    }
    if (lockedOfferSnap.data().status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${lockedOfferSnap.data().status}, cannot counter.`
      );
    }

    const now = Timestamp.now();
    const expiryHours = offer.expiryHours || EXPIRY_DEFAULT_HOURS;
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    );
    const newRound = deal.round + 1;

    // Determine the counter-offerer's role
    const counterOffererRole = uid === deal.sellerId ? 'seller' : 'buyer';
    // Flip the turn to the other party
    const nextTurnUid = uid === deal.buyerId ? deal.sellerId : deal.buyerId;

    const latestOfferSnapshot = {
      price: offer.price,
      quantity: offer.quantity,
      unit: offer.unit,
      currency: offer.currency,
      incoterm: offer.incoterm,
      namedPlace: offer.namedPlace,
      estimatedTotal: offer.price * offer.quantity,
      expiresAt,
      submittedBy: uid,
    };

    // Mark old offer as countered
    transaction.update(latestOfferRef, {
      status: OFFER_STATUS.COUNTERED,
      updatedAt: now,
    });

    // Create new offer document
    const newOfferRef = dealRef.collection('offers').doc();
    const { expiryHours: _expiryHours, ...offerTerms } = offer;
    transaction.set(newOfferRef, {
      round: newRound,
      submittedBy: uid,
      role: counterOffererRole,
      ...offerTerms,
      conversionRate: offer.conversionRate || null,
      notes: offer.notes || null,
      attachments: [],
      status: OFFER_STATUS.OPEN,
      expiresAt,
      estimatedTotal: offer.price * offer.quantity,
      createdAt: now,
      updatedAt: now,
    });

    // Update deal: advance round, flip turn, update snapshot
    transaction.update(dealRef, {
      round: newRound,
      currentTurnUid: nextTurnUid,
      latestOfferSnapshot,
      updatedAt: now,
    });
  });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('submitCounterOffer failed:', error);
    throw new HttpsError('internal', error.message || 'Failed to submit counter-offer.');
  }

  console.log(`Counter-offer submitted for deal: ${dealId} by user: ${uid}`);
  return { success: true, dealId };
});

/**
 * Accept Offer
 *
 * Atomically accepts an open offer, setting both the offer and deal status
 * to 'accepted'. Phase 3 triggers contract generation via onDocumentUpdated
 * on deal.status change — this CF only sets the status.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.acceptOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only negotiating deals can be accepted.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot accept.`
      );
    }

    // Check offer has not expired
    const now = Timestamp.now();
    if (offer.expiresAt && offer.expiresAt.toMillis() <= now.toMillis()) {
      throw new HttpsError(
        'failed-precondition',
        'Offer has expired and cannot be accepted.'
      );
    }

    transaction.update(offerRef, {
      status: OFFER_STATUS.ACCEPTED,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.ACCEPTED,
      updatedAt: now,
    });
  });

  // Append status history (outside transaction — prevents duplicate writes on retry)
  try {
    await appendStatusHistory(dealId, DEAL_STATUS.ACCEPTED, uid, '', 'Offer accepted');
  } catch (err) {
    console.error('acceptOffer: appendStatusHistory failed (non-fatal):', err);
  }

  console.log(`Offer ${offerId} accepted for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

/**
 * Reject Offer
 *
 * Atomically rejects an open offer, setting both the offer and deal status
 * to 'rejected'. Same guard structure as acceptOffer.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.rejectOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // State machine guards
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Only negotiating deals can be rejected.`
      );
    }
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'It is not your turn to respond.');
    }
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot reject.`
      );
    }

    const now = Timestamp.now();

    transaction.update(offerRef, {
      status: OFFER_STATUS.REJECTED,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.REJECTED,
      updatedAt: now,
    });
  });

  console.log(`Offer ${offerId} rejected for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

/**
 * Withdraw Offer
 *
 * Allows the offer submitter to withdraw their open offer before the other
 * party responds. Only the sender can withdraw; deal is also marked withdrawn.
 *
 * @param {Object} data - { dealId, offerId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.withdrawOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // Only the offer submitter can withdraw
    if (offer.submittedBy !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the offer submitter can withdraw this offer.'
      );
    }
    // Can only withdraw open offers
    if (offer.status !== OFFER_STATUS.OPEN) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}, cannot withdraw.`
      );
    }
    // Deal must still be negotiating
    if (deal.status !== DEAL_STATUS.NEGOTIATING) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Cannot withdraw from a ${deal.status} deal.`
      );
    }

    const now = Timestamp.now();

    transaction.update(offerRef, {
      status: OFFER_STATUS.WITHDRAWN,
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.WITHDRAWN,
      updatedAt: now,
    });
  });

  console.log(`Offer ${offerId} withdrawn for deal: ${dealId} by user: ${uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Deal Notification Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sendDealEmail — wraps Resend SDK call.
 *
 * Non-blocking: email failure does NOT fail the Cloud Function.
 * From address uses verified custom domain coretradeglobal.com.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} htmlBody - HTML content for the email body
 */
async function sendDealEmail(to, subject, htmlBody) {
  if (!to || !subject || !htmlBody) return;
  const resend = getResend();
  if (!resend) {
    console.warn('sendDealEmail: RESEND_API_KEY not set, skipping email.');
    return;
  }
  try {
    await resend.emails.send({
      from: 'CoreTradeGlobal <noreply@coretradeglobal.com>',
      to,
      subject,
      html: htmlBody,
    });
    console.log(`sendDealEmail: sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`sendDealEmail: failed to send to ${to}:`, err);
    // Non-blocking — swallow the error
  }
}

/**
 * Build per-event subject line and text for notifications / emails.
 */
function getDealEventCopy(eventType, productName) {
  const name = productName || 'this product';
  const map = {
    new_deal: {
      title: `New offer on ${name}`,
      body: `A new deal offer has been submitted for ${name}.`,
      subject: `New offer on ${name}`,
    },
    counter_offer: {
      title: `Counter-offer received on ${name}`,
      body: `A counter-offer has been submitted for ${name}.`,
      subject: `Counter-offer received on ${name}`,
    },
    accepted: {
      title: `Offer accepted on ${name}`,
      body: `The offer on ${name} has been accepted. Congratulations!`,
      subject: `Offer accepted on ${name}`,
    },
    rejected: {
      title: `Offer rejected on ${name}`,
      body: `The offer on ${name} has been rejected.`,
      subject: `Offer rejected on ${name}`,
    },
    expired: {
      title: `Offer expired on ${name}`,
      body: `The offer on ${name} has expired.`,
      subject: `Offer expired on ${name}`,
    },
    withdrawn: {
      title: `Offer withdrawn on ${name}`,
      body: `The offer on ${name} has been withdrawn by the sender.`,
      subject: `Offer withdrawn on ${name}`,
    },
    renewed: {
      title: `Offer renewed on ${name}`,
      body: `The expired offer on ${name} has been renewed with a new deadline.`,
      subject: `Offer renewed on ${name}`,
    },
    contract_approved_by_party: {
      title: `Contract update on ${name}`,
      body: `A party has approved all contract clauses for the deal on ${name}.`,
      subject: `Contract clause approval on ${name}`,
    },
    contract_both_approved: {
      title: `Contract fully approved on ${name}`,
      body: `Contract fully approved — deal ready to proceed for ${name}.`,
      subject: `Contract fully approved on ${name}`,
    },
    shipment_update: {
      title: `Shipment status updated on ${name}`,
      body: `A shipment status update has been posted for the deal on ${name}.`,
      subject: `Shipment update on ${name}`,
    },
    insurance_coverage: {
      title: `Insurance coverage active on ${name}`,
      body: `Insurance coverage has been confirmed for the deal on ${name}.`,
      subject: `Insurance coverage confirmed on ${name}`,
    },
  };
  return map[eventType] || {
    title: `Deal update on ${name}`,
    body: `There is a new update for the deal on ${name}.`,
    subject: `Deal update on ${name}`,
  };
}

/**
 * buildBrandedEmailHtml — shared branded HTML email template for all system emails.
 *
 * Produces a responsive, table-based HTML email with CTG dark-theme branding.
 * Uses inline CSS only — email clients strip <style> tags.
 *
 * @param {string} body - HTML string for the email body content
 * @param {string|null} ctaLabel - Label for the CTA button (optional)
 * @param {string|null} ctaUrl - URL for the CTA button (optional, skip button if not provided)
 * @param {string|null} footerNote - Optional additional text above the standard footer line
 * @returns {string} Full HTML email string
 */
function buildBrandedEmailHtml(body, ctaLabel, ctaUrl, footerNote) {
  const ctaBlock = ctaLabel && ctaUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
        <tr>
          <td>
            <a href="${ctaUrl}"
               style="display:inline-block;background:#FFD700;color:#000000;text-decoration:none;
                      padding:14px 28px;border-radius:6px;font-weight:bold;font-size:15px;
                      font-family:Arial,sans-serif;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const footerNoteBlock = footerNote
    ? `<p style="margin:24px 0 8px 0;font-size:13px;color:#8899AA;font-family:Arial,sans-serif;">${footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>CoreTradeGlobal</title></head>
<body style="margin:0;padding:0;background-color:#0D1724;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0D1724;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0F1C2E;padding:28px 32px;border-radius:8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:0.5px;">
                      Core<span style="color:#FFD700;">Trade</span>Global
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td height="3" style="background-color:#FFD700;font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#1A2332;padding:36px 32px;color:#E8EDF2;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;border-left:1px solid #243044;border-right:1px solid #243044;">
              ${body}
              ${ctaBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0F1C2E;padding:20px 32px;border-radius:0 0 8px 8px;border:1px solid #243044;border-top:1px solid #243044;">
              ${footerNoteBlock}
              <p style="margin:0;font-size:12px;color:#556677;font-family:Arial,sans-serif;line-height:1.5;">
                You received this email because you have an account on CoreTradeGlobal.
                If you no longer wish to receive these emails, you can manage your preferences in
                <a href="${APP_URL}/settings" style="color:#8899AA;text-decoration:underline;">Notification Settings</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * sendDealNotifications — orchestrates all 3 notification channels for deal events.
 *
 * Sends to all deal participants EXCEPT the sender (actor) uid.
 * Channels: Firestore in-app notification, FCM push (with smart suppression), Resend email.
 *
 * IMPORTANT: Call this OUTSIDE transactions to prevent duplicate sends on transaction retries.
 *
 * @param {string} dealId
 * @param {string} eventType - new_deal | counter_offer | accepted | rejected | expired | withdrawn | renewed
 * @param {string} senderUid - The UID of the party who triggered the event (excluded from notifications)
 * @param {object} deal - Firestore deal document data
 */
async function sendDealNotifications(dealId, eventType, senderUid, deal) {
  const { title, body } = getDealEventCopy(eventType, deal.productName);
  const allParticipants = [deal.buyerId, deal.sellerId].filter(Boolean);
  const recipients = allParticipants.filter((uid) => uid !== senderUid);

  if (recipients.length === 0) {
    console.log(`sendDealNotifications: no recipients for event ${eventType} on deal ${dealId}`);
    return;
  }

  const now = Timestamp.now();

  for (const recipientId of recipients) {
    // --- a) Firestore in-app notification ---
    try {
      await db.collection('users').doc(recipientId).collection('notifications').add({
        type: 'deal',
        eventType,
        title,
        body,
        dealId,
        dealProductName: deal.productName || '',
        isRead: false,
        createdAt: now,
        link: `/deals/${dealId}`,
      });
    } catch (err) {
      console.error(`sendDealNotifications: failed to create in-app notification for ${recipientId}:`, err);
    }

    // --- b) FCM push notification (smart suppression + preference check) ---
    try {
      const userDoc = await db.collection('users').doc(recipientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        // Check notification preferences — default to true if not set
        const pushEnabled = userData.preferences?.deals?.push !== false;
        const emailEnabled = userData.preferences?.deals?.email !== false;

        // Smart suppression: skip FCM if user is actively viewing this deal
        const viewingDealId = userData.viewingDealId;
        const viewingDealSince = userData.viewingDealSince?.toMillis?.() || 0;
        const now60sAgo = Date.now() - 60000;
        const isActivelyViewing = viewingDealId === dealId && viewingDealSince > now60sAgo;

        if (fcmToken && pushEnabled && !isActivelyViewing) {
          try {
            await messaging.send({
              token: fcmToken,
              data: {
                type: 'deal_event',
                dealId,
                eventType,
                title,
                body,
                click_action: `/deals/${dealId}`,
              },
              webpush: {
                fcmOptions: { link: `/deals/${dealId}` },
              },
            });
          } catch (fcmErr) {
            console.error(`sendDealNotifications: FCM error for ${recipientId}:`, fcmErr.code);
            // Clean up invalid tokens
            if (
              fcmErr.code === 'messaging/invalid-registration-token' ||
              fcmErr.code === 'messaging/registration-token-not-registered'
            ) {
              await db.collection('users').doc(recipientId).update({
                fcmToken: FieldValue.delete(),
              });
            }
          }
        } else if (!pushEnabled) {
          console.log(`sendDealNotifications: push disabled for deals by ${recipientId} — skipping FCM`);
        } else if (isActivelyViewing) {
          console.log(`sendDealNotifications: suppressed FCM for ${recipientId} — actively viewing deal ${dealId}`);
        }

        // --- c) Resend email notification (respects email preference) ---
        const recipientEmail = userData.email;
        if (recipientEmail && emailEnabled) {
          const { subject, body: eventBody } = getDealEventCopy(eventType, deal.productName);
          const dealUrl = `${APP_URL}/deals/${dealId}`;
          const htmlBody = buildBrandedEmailHtml(`<p style="margin:0 0 16px 0;">${eventBody}</p>`, 'View Deal', dealUrl);
          await sendDealEmail(recipientEmail, subject, htmlBody);
        } else if (recipientEmail && !emailEnabled) {
          console.log(`sendDealNotifications: email disabled for deals by ${recipientId} — skipping email`);
        }
      }
    } catch (err) {
      console.error(`sendDealNotifications: error processing recipient ${recipientId}:`, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Event Triggers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * onDealOfferCreated
 *
 * Fires when a new offer document is created inside a deal's offers subcollection.
 * Determines whether this is a new deal (round 1) or a counter-offer (round > 1),
 * sends all 3 notification channels to the other party, and posts a system message
 * to the linked conversation.
 */
exports.onDealOfferCreated = onDocumentCreated(
  'deals/{dealId}/offers/{offerId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const offer = snapshot.data();
    const { dealId } = event.params;

    try {
      const dealDoc = await db.collection('deals').doc(dealId).get();
      if (!dealDoc.exists) {
        console.log(`onDealOfferCreated: deal ${dealId} not found`);
        return null;
      }
      const deal = dealDoc.data();

      // Determine event type
      const eventType = offer.round === 1 ? 'new_deal' : 'counter_offer';

      // Send notifications (outside transaction — non-blocking, non-duplicate)
      await sendDealNotifications(dealId, eventType, offer.submittedBy, deal);

      // Post system message to conversation (if conversationId is linked)
      if (deal.conversationId) {
        try {
          const conversationRef = db.collection('conversations').doc(deal.conversationId);
          const systemMsgRef = conversationRef.collection('messages').doc();
          const now = Timestamp.now();
          const content =
            eventType === 'new_deal'
              ? `Deal initiated for ${deal.productName || 'this product'}`
              : `Counter-offer (Round ${offer.round}) for ${deal.productName || 'this product'}`;

          await db.runTransaction(async (t) => {
            t.set(systemMsgRef, {
              type: 'system',
              content,
              dealId,
              dealLink: `/deals/${dealId}`,
              senderId: offer.submittedBy,
              createdAt: now,
              updatedAt: now,
            });
            t.update(conversationRef, {
              'lastMessage.content': content,
              'lastMessage.type': 'system',
              'lastMessage.createdAt': now,
              updatedAt: now,
            });
          });
        } catch (msgErr) {
          console.error('onDealOfferCreated: failed to post system message (non-fatal):', msgErr);
        }
      }

      console.log(`onDealOfferCreated: processed ${eventType} for deal ${dealId}`);
      return null;
    } catch (err) {
      console.error(`onDealOfferCreated: error for deal ${dealId}:`, err);
      return null;
    }
  }
);

/**
 * onDealStatusChanged
 *
 * Fires when a deal document is updated. Detects terminal status transitions
 * (accepted, rejected, withdrawn, expired) and sends notifications to both parties.
 *
 * Phase 3 independently listens to deal.status === 'accepted' for contract generation.
 */
exports.onDealStatusChanged = onDocumentUpdated(
  'deals/{dealId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return null;
    if (before.status === after.status) return null;

    const { dealId } = event.params;

    // ── Contract generation on 'accepted' transition ──────────────────────────
    // Merged from the removed onDealAccepted trigger to avoid duplicate triggers
    // on the same 'deals/{dealId}' path (Firebase Functions v2 deployment error).
    if (after.status === DEAL_STATUS.ACCEPTED) {
      try {
        // Fetch the accepted offer from the offers subcollection
        const offersQuery = await db
          .collection('deals')
          .doc(dealId)
          .collection('offers')
          .where('status', '==', OFFER_STATUS.ACCEPTED)
          .limit(1)
          .get();

        if (offersQuery.empty) {
          console.error(`onDealStatusChanged: no accepted offer found for deal ${dealId}`);
        } else {
          const acceptedOffer = offersQuery.docs[0].data();

          // Build clauses from the accepted offer + deal data
          const clauses = buildContractClausesCJS(acceptedOffer, after);

          // 1500ms delay for UX feel — "Generating contract..."
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Write the contract document
          const contractRef = db.collection('deals').doc(dealId).collection('contract').doc('main');
          await contractRef.set({
            dealId,
            dealBuyerId: after.buyerId,   // denormalized for saveDraftApprovals buyer/seller lookup
            dealSellerId: after.sellerId, // denormalized for saveDraftApprovals buyer/seller lookup
            generatedAt: Timestamp.now(),
            deadline: null,               // placeholder — enforcement deferred to future phase
            clauses,
            buyerApproval: { approvedClauses: [], hasSubmitted: false, submittedAt: null },
            sellerApproval: { approvedClauses: [], hasSubmitted: false, submittedAt: null },
            status: CONTRACT_STATUS.PENDING,
          });

          console.log(`onDealStatusChanged: contract generated for deal ${dealId}`);
        }
      } catch (err) {
        console.error(`onDealStatusChanged: error generating contract for deal ${dealId}:`, err);
        // Non-fatal — do not block notification/message steps below
      }
    }

    // ── Broadcast quote requests on contract_approved transition (Phase 4) ───
    if (
      before.status !== DEAL_STATUS.CONTRACT_APPROVED &&
      after.status === DEAL_STATUS.CONTRACT_APPROVED
    ) {
      try {
        await broadcastQuoteRequests(dealId, after);
      } catch (err) {
        console.error(`broadcastQuoteRequests failed for deal ${dealId}:`, err);
        // Non-fatal — do not block existing contract_approved flow
      }
    }

    // ── Notifications and system messages for terminal status transitions ─────
    const terminalStatuses = ['accepted', 'rejected', 'withdrawn', 'expired'];
    if (!terminalStatuses.includes(after.status)) return null;

    try {
      // Determine the actor who triggered the change
      // For accepted/rejected: the party whose turn it was (currentTurnUid from BEFORE snapshot)
      // For expired: system (no specific actor — notify both)
      // For withdrawn: the submitter of the withdrawn offer (handled via sendDealNotifications with senderUid)
      let actorUid;
      if (after.status === 'expired') {
        // Both parties are notified — use a sentinel value that matches no participant
        actorUid = 'system';
      } else {
        // Use before.currentTurnUid — that's who accepted/rejected/withdrew
        actorUid = before.currentTurnUid || 'system';
      }

      // Map deal status to notification event type
      const eventTypeMap = {
        accepted: 'accepted',
        rejected: 'rejected',
        withdrawn: 'withdrawn',
        expired: 'expired',
      };
      const eventType = eventTypeMap[after.status];

      await sendDealNotifications(dealId, eventType, actorUid, after);

      // Update deal status on conversation metadata
      if (after.conversationId) {
        try {
          await db.collection('conversations').doc(after.conversationId).update({
            'metadata.dealStatus': after.status,
          });
        } catch (metaErr) {
          console.error('onDealStatusChanged: failed to update conversation metadata (non-fatal):', metaErr);
        }
      }

      // Post system message to conversation (if conversationId is linked)
      if (after.conversationId) {
        try {
          const statusMessages = {
            accepted: `Deal accepted for ${after.productName || 'this product'}`,
            rejected: `Deal rejected for ${after.productName || 'this product'}`,
            withdrawn: `Offer withdrawn for ${after.productName || 'this product'}`,
            expired: `Offer expired for ${after.productName || 'this product'}`,
          };
          const content = statusMessages[after.status] || `Deal status changed to ${after.status}`;
          const conversationRef = db.collection('conversations').doc(after.conversationId);
          const systemMsgRef = conversationRef.collection('messages').doc();
          const now = Timestamp.now();

          await db.runTransaction(async (t) => {
            t.set(systemMsgRef, {
              type: 'system',
              content,
              dealId,
              dealLink: `/deals/${dealId}`,
              senderId: actorUid,
              createdAt: now,
              updatedAt: now,
            });
            t.update(conversationRef, {
              'lastMessage.content': content,
              'lastMessage.type': 'system',
              'lastMessage.createdAt': now,
              updatedAt: now,
            });
          });
        } catch (msgErr) {
          console.error('onDealStatusChanged: failed to post system message (non-fatal):', msgErr);
        }
      }

      console.log(`onDealStatusChanged: deal ${dealId} transitioned ${before.status} → ${after.status}`);
      return null;
    } catch (err) {
      console.error(`onDealStatusChanged: error for deal ${dealId}:`, err);
      return null;
    }
  }
);

/**
 * Renew Offer
 *
 * Allows the original offer sender to reactivate an expired offer with a new
 * expiry deadline. Only the submitter can renew; only expired offers can be renewed.
 *
 * @param {Object} data - { dealId, offerId, newExpiryHours }
 * @returns {Promise<{ success: boolean }>}
 */
exports.renewOffer = onCall(async (request) => {
  const { dealId, offerId, newExpiryHours } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !offerId) {
    throw new HttpsError('invalid-argument', 'dealId and offerId are required.');
  }

  const expiryHours = newExpiryHours || EXPIRY_DEFAULT_HOURS;

  let deal;

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found.');

    const dealData = dealSnap.data();
    const offer = offerSnap.data();

    // Guard: only the original sender can renew
    if (offer.submittedBy !== uid) {
      throw new HttpsError('permission-denied', 'Only the offer sender can renew an expired offer.');
    }
    // Guard: can only renew expired offers
    if (offer.status !== OFFER_STATUS.EXPIRED) {
      throw new HttpsError(
        'failed-precondition',
        `Offer is ${offer.status}. Only expired offers can be renewed.`
      );
    }

    const now = Timestamp.now();
    const newExpiresAt = Timestamp.fromDate(
      new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    );

    // Flip the turn to the OTHER party (the receiver must now respond)
    const nextTurnUid = uid === dealData.buyerId ? dealData.sellerId : dealData.buyerId;

    transaction.update(offerRef, {
      status: OFFER_STATUS.OPEN,
      expiresAt: newExpiresAt,
      remindersSet: [],
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: DEAL_STATUS.NEGOTIATING,
      currentTurnUid: nextTurnUid,
      updatedAt: now,
    });

    deal = dealData;
  });

  // Post-transaction: notify the other party about renewal (non-blocking)
  if (deal) {
    await sendDealNotifications(dealId, 'renewed', uid, deal);
  }

  console.log(`renewOffer: offer ${offerId} renewed for deal ${dealId} by ${uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Contract Approval Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildContractClausesCJS — inline CJS version of buildContractClauses from contractConstants.js.
 *
 * Cannot import ESM from Next.js app in Cloud Functions (CommonJS).
 * Generates the same 8 clause objects from accepted offer + deal data.
 *
 * @param {Object} offer - Accepted offer document data
 * @param {Object} deal  - Parent deal document data
 * @returns {Object[]} Array of 8 clause objects
 */
function buildContractClausesCJS(offer, deal) {
  const INCOTERMS_DESCRIPTIONS = {
    EXW: 'Seller makes goods available at their premises. Buyer bears all costs and risk.',
    FCA: 'Seller delivers goods to carrier at named place. Risk transfers at delivery to carrier.',
    CPT: 'Seller pays freight to named destination. Risk transfers when goods handed to carrier.',
    CIP: 'Seller pays freight and insurance to named destination.',
    DAP: 'Seller delivers to named destination. Buyer handles import customs and duties.',
    DPU: 'Seller delivers and unloads goods at named destination.',
    DDP: 'Maximum seller obligation. Seller pays all costs including duties.',
    FAS: 'Sea/inland waterway only. Seller delivers alongside vessel at named port.',
    FOB: 'Sea/inland waterway only. Risk transfers when goods loaded on vessel.',
    CFR: 'Sea only. Seller pays freight to destination port. Risk transfers at loading.',
    CIF: 'Sea only. Seller pays freight and insurance to destination port.',
  };

  const PAYMENT_TERMS_LABELS = {
    cash: 'Cash',
    '30_days': '30-Day Payment',
    '60_days': '60-Day Payment',
    '90_days': '90-Day Payment',
    lc: 'Letter of Credit (LC)',
    dap: 'Documents Against Payment',
  };

  const currency = offer.currency || 'USD';
  const unit = offer.unit || '';
  const price = offer.price || 0;
  const quantity = offer.quantity || 0;

  // Format with a simple locale-safe approach (Intl is available in Node.js)
  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const totalValue = offer.estimatedTotal || price * quantity;
  const formattedPrice = formatCurrency(price);
  const formattedTotal = formatCurrency(totalValue);

  // Format delivery deadline
  let deliveryDeadlineValue = 'To be agreed';
  if (offer.deliveryDeadline) {
    try {
      const date = offer.deliveryDeadline?.toDate
        ? offer.deliveryDeadline.toDate()
        : new Date(offer.deliveryDeadline);
      deliveryDeadlineValue = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      deliveryDeadlineValue = String(offer.deliveryDeadline);
    }
  }

  // Insurance clause
  const insurancePref = offer.insurancePreference;
  let insuranceValue;
  if (insurancePref === 'seller_provides') {
    insuranceValue = 'Seller provides cargo insurance';
  } else if (insurancePref === 'buyer_provides') {
    insuranceValue = 'Buyer provides cargo insurance';
  } else {
    insuranceValue = 'No insurance required (per Incoterm default)';
  }

  const incotermDescription = INCOTERMS_DESCRIPTIONS[offer.incoterm] || offer.incoterm;

  return [
    {
      id: 'price',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Unit Price',
      value: `${formattedPrice} per ${unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'quantity',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Quantity',
      value: `${quantity} ${unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'total_value',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Total Contract Value',
      value: formattedTotal,
      sourceLabel: 'Calculated from price x quantity',
    },
    {
      id: 'incoterm',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Incoterm',
      value: `${offer.incoterm} — ${incotermDescription}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'named_place',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Named Place',
      value: offer.namedPlace || 'To be agreed',
      sourceLabel: 'From negotiation',
    },
    {
      id: 'delivery_deadline',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Delivery Deadline',
      value: deliveryDeadlineValue,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'payment_terms',
      section: 'payment',
      sectionTitle: 'Payment',
      title: 'Payment Terms',
      value: PAYMENT_TERMS_LABELS[offer.paymentTerms] || offer.paymentTerms || 'To be agreed',
      sourceLabel: 'From negotiation',
    },
    {
      id: 'insurance',
      section: 'insurance',
      sectionTitle: 'Insurance & Risk',
      title: 'Insurance Responsibility',
      value: insuranceValue,
      sourceLabel: 'From Incoterm default',
    },
  ];
}


/**
 * saveDraftApprovals — onCall
 *
 * Saves a party's current clause approval selections as a draft.
 * This is a non-transactional best-effort save — safe to call on every checkbox change.
 * Debounce-safe: always replaces the full array (not arrayUnion).
 *
 * Guards:
 * - Auth required
 * - Contract must exist
 * - Caller must be a deal participant (checked via denormalized fields on contract)
 * - Cannot modify after submission (hasSubmitted === true)
 *
 * @param {Object} data - { dealId, approvedClauses }
 * @returns {Promise<{ success: boolean }>}
 */
exports.saveDraftApprovals = onCall(async (request) => {
  const { dealId, approvedClauses } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId) throw new HttpsError('invalid-argument', 'dealId is required.');
  if (!Array.isArray(approvedClauses)) {
    throw new HttpsError('invalid-argument', 'approvedClauses must be an array.');
  }

  const contractRef = db.collection('deals').doc(dealId).collection('contract').doc('main');
  const contractDoc = await contractRef.get();

  if (!contractDoc.exists) {
    throw new HttpsError('not-found', 'Contract not found.');
  }

  const contractData = contractDoc.data();

  // Participation check using denormalized fields — no extra deal fetch required
  if (uid !== contractData.dealBuyerId && uid !== contractData.dealSellerId) {
    throw new HttpsError('permission-denied', 'You are not a participant in this deal.');
  }

  const isBuyer = contractData.dealBuyerId === uid;
  const approvalKey = isBuyer ? 'buyerApproval.approvedClauses' : 'sellerApproval.approvedClauses';
  const hasSubmittedKey = isBuyer ? 'buyerApproval.hasSubmitted' : 'sellerApproval.hasSubmitted';

  // Cannot modify after submission
  const myApproval = isBuyer ? contractData.buyerApproval : contractData.sellerApproval;
  if (myApproval?.hasSubmitted === true) {
    throw new HttpsError('failed-precondition', 'Cannot modify approvals after submission.');
  }

  // Replace full array (not arrayUnion — draft save always reflects current UI state)
  await contractRef.update({ [approvalKey]: approvedClauses });

  console.log(`saveDraftApprovals: saved ${approvedClauses.length} clause approvals for ${uid} on deal ${dealId}`);
  return { success: true };
});

/**
 * submitContractApproval — onCall
 *
 * Atomically submits a party's final clause approvals and advances the deal to
 * 'contract_approved' if both parties have now submitted.
 *
 * Uses runTransaction to prevent the race condition where both parties submit
 * simultaneously and both read otherHasSubmitted = false.
 *
 * Guards (inside transaction):
 * - Deal exists, contract exists
 * - Caller is a deal participant
 * - Deal status is 'accepted' (not already contract_approved)
 * - Party has not already submitted (hasSubmitted === false)
 * - Party has approved ALL clauses (approvedClauses.length === clauses.length)
 *
 * @param {Object} data - { dealId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.submitContractApproval = onCall(async (request) => {
  const { dealId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId) throw new HttpsError('invalid-argument', 'dealId is required.');

  const dealRef = db.collection('deals').doc(dealId);
  const contractRef = dealRef.collection('contract').doc('main');

  let isFullyApproved = false;
  let deal;

  await db.runTransaction(async (t) => {
    // Read both documents in parallel inside the transaction
    const [dealSnap, contractSnap] = await Promise.all([
      t.get(dealRef),
      t.get(contractRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!contractSnap.exists) throw new HttpsError('not-found', 'Contract not found.');

    deal = dealSnap.data();
    const contract = contractSnap.data();

    // Participation guard
    if (uid !== deal.buyerId && uid !== deal.sellerId) {
      throw new HttpsError('permission-denied', 'You are not a participant in this deal.');
    }

    // Status guard — deal must still be in 'accepted' state
    if (deal.status !== DEAL_STATUS.ACCEPTED) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Contract approval requires deal status 'accepted'.`
      );
    }

    const isBuyer = uid === deal.buyerId;
    const approvalKey = isBuyer ? 'buyerApproval' : 'sellerApproval';
    const otherApprovalKey = isBuyer ? 'sellerApproval' : 'buyerApproval';

    const myApproval = contract[approvalKey] || {};
    const otherApproval = contract[otherApprovalKey] || {};

    // Re-submission guard
    if (myApproval.hasSubmitted === true) {
      throw new HttpsError('failed-precondition', 'You have already submitted your approval.');
    }

    // All-clauses guard
    const totalClauses = (contract.clauses || []).length;
    const myApprovedCount = (myApproval.approvedClauses || []).length;
    if (myApprovedCount !== totalClauses) {
      throw new HttpsError(
        'failed-precondition',
        `You must approve all ${totalClauses} clauses before submitting (${myApprovedCount} approved).`
      );
    }

    const now = Timestamp.now();

    // Build update data for the contract
    const contractUpdate = {
      [`${approvalKey}.hasSubmitted`]: true,
      [`${approvalKey}.submittedAt`]: now,
    };

    // Check if the other party has already submitted
    if (otherApproval.hasSubmitted === true) {
      // Both parties have now submitted — advance the deal
      contractUpdate.status = CONTRACT_STATUS.BOTH_APPROVED;
      isFullyApproved = true;

      t.update(contractRef, contractUpdate);
      t.update(dealRef, {
        status: DEAL_STATUS.CONTRACT_APPROVED,
        updatedAt: now,
      });
    } else {
      // Only this party has submitted so far
      contractUpdate.status = isBuyer ? CONTRACT_STATUS.BUYER_APPROVED : CONTRACT_STATUS.SELLER_APPROVED;
      t.update(contractRef, contractUpdate);
    }
  });

  // Post-transaction notifications (outside transaction — prevents duplicate sends on retry)
  if (deal) {
    if (isFullyApproved) {
      // Both parties approved — notify both (pass 'system' as senderUid to send to all participants)
      await sendDealNotifications(dealId, 'contract_both_approved', 'system', deal);
      // Append status history for CONTRACT_APPROVED transition
      try {
        await appendStatusHistory(dealId, DEAL_STATUS.CONTRACT_APPROVED, uid, '', 'Contract approved by both parties');
      } catch (err) {
        console.error('submitContractApproval: appendStatusHistory failed (non-fatal):', err);
      }
    } else {
      // One party submitted — notify the other party only (pass uid as senderUid to exclude submitter)
      await sendDealNotifications(dealId, 'contract_approved_by_party', uid, deal);
    }
  }

  console.log(`submitContractApproval: ${uid} submitted approval for deal ${dealId}${isFullyApproved ? ' — BOTH APPROVED' : ''}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Quote Request / Provider Portal Cloud Functions (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * broadcastQuoteRequests — private helper (not exported)
 *
 * Called from onDealStatusChanged when deal transitions to contract_approved.
 * Creates one quoteRequest document per insurance/logistics provider.
 *
 * Price separation (PORTAL-05):
 * - Insurance providers: receive full dealSnapshot including price and estimatedTotal
 * - Logistics providers: explicit allowlist only — price and estimatedTotal NEVER included
 *
 * IMPORTANT: Must be called OUTSIDE transactions (same pattern as sendDealNotifications).
 *
 * @param {string} dealId
 * @param {Object} dealData — deal document data (after snapshot)
 */
async function broadcastQuoteRequests(dealId, dealData) {
  const snapshot = dealData.latestOfferSnapshot || {};

  // Query all insurance and logistics providers
  const providersSnap = await db
    .collection('users')
    .where('role', 'in', [ROLES.INSURANCE_PROVIDER, ROLES.LOGISTICS_PROVIDER])
    .get();

  if (providersSnap.empty) {
    console.log(`broadcastQuoteRequests: no providers found for deal ${dealId}`);
    return;
  }

  // Phase 14: Fetch buyer and seller user docs for name/country denormalization
  const [buyerDoc, sellerDoc] = await Promise.all([
    db.collection('users').doc(dealData.buyerId).get(),
    db.collection('users').doc(dealData.sellerId).get(),
  ]);
  const buyerData = buyerDoc.data() || {};
  const sellerData = sellerDoc.data() || {};
  const buyerName = buyerData.companyName || buyerData.displayName || 'Buyer';
  const buyerCountry = buyerData.country || null;
  const sellerName = sellerData.companyName || sellerData.displayName || 'Seller';
  const sellerCountry = sellerData.country || null;

  const now = Timestamp.now();
  // Deadline: 72 hours from broadcast
  const deadline = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);

  const batch = db.batch();

  // Insurance dealSnapshot — full fields including price
  const insuranceDealSnapshot = {
    productName: dealData.productName || null,
    productImage: dealData.productImage || null,
    quantity: snapshot.quantity || null,
    unit: snapshot.unit || null,
    incoterm: snapshot.incoterm || null,
    namedPlace: snapshot.namedPlace || null,
    paymentTerms: snapshot.paymentTerms || null,
    deliveryDeadline: snapshot.deliveryDeadline || null,
    currency: snapshot.currency || null,
    price: snapshot.price || null,
    estimatedTotal: snapshot.estimatedTotal || null,
    terms: snapshot.terms || null,
    // Phase 14: buyer/seller identity for quote form context
    buyerName,
    buyerCountry,
    sellerName,
    sellerCountry,
  };

  // Logistics dealSnapshot — explicit allowlist; price/estimatedTotal intentionally excluded (PORTAL-05)
  const logisticsDealSnapshot = {
    productName: dealData.productName || null,
    productImage: dealData.productImage || null,
    quantity: snapshot.quantity || null,
    unit: snapshot.unit || null,
    incoterm: snapshot.incoterm || null,
    namedPlace: snapshot.namedPlace || null,
    paymentTerms: snapshot.paymentTerms || null,
    deliveryDeadline: snapshot.deliveryDeadline || null,
    currency: snapshot.currency || null,
    // price and estimatedTotal are intentionally omitted for logistics providers
    // Phase 14: buyer/seller identity included for both provider types
    buyerName,
    buyerCountry,
    sellerName,
    sellerCountry,
  };

  let count = 0;
  // Track provider info for post-commit FCM push notifications
  const providerPushQueue = [];

  for (const providerDoc of providersSnap.docs) {
    const providerData = providerDoc.data();
    // Normalize role to short-form providerType: 'insurance' or 'logistics'
    // Frontend entities and hooks filter by short-form values.
    const providerType = providerData.role === ROLES.INSURANCE_PROVIDER
      ? 'insurance'
      : 'logistics';
    const dealSnapshot =
      providerType === 'insurance' ? insuranceDealSnapshot : logisticsDealSnapshot;

    const requestRef = db.collection('quoteRequests').doc();
    batch.set(requestRef, {
      dealId,
      providerUid: providerDoc.id,
      providerType,
      dealSnapshot,
      buyerId: dealData.buyerId,
      sellerId: dealData.sellerId,
      participants: [dealData.buyerId, dealData.sellerId, providerDoc.id],
      status: QUOTE_REQUEST_STATUS.PENDING,
      deadline,
      createdAt: now,
      updatedAt: now,
    });
    count++;

    // Queue provider for post-commit notification (outside batch — non-blocking)
    providerPushQueue.push({ providerId: providerDoc.id, providerData, requestId: requestRef.id, providerType });
  }

  await batch.commit();
  console.log(`broadcastQuoteRequests: created ${count} quote request(s) for deal ${dealId}`);

  // --- Post-commit: send in-app + FCM push to each provider ---
  // Called OUTSIDE batch.commit() to follow the sendDealNotifications non-blocking pattern.
  const productName = dealData.productName || 'a product';
  for (const { providerId, providerData, requestId, providerType } of providerPushQueue) {
    const providerTypeName = providerType === 'insurance' ? 'Insurance' : 'Logistics';
    const notifTitle = 'New Quote Request';
    const notifBody = `You have a new ${providerTypeName} quote request for ${productName}.`;

    // --- a) Firestore in-app notification ---
    try {
      await db.collection('users').doc(providerId).collection('notifications').add({
        type: 'quote_received',
        title: notifTitle,
        body: notifBody,
        dealId,
        requestId,
        providerType,
        isRead: false,
        createdAt: now,
        link: `/provider/quotes/${requestId}`,
      });
    } catch (err) {
      console.error(`broadcastQuoteRequests: failed in-app notification for provider ${providerId}:`, err);
    }

    // --- b) FCM push notification (preference check) ---
    try {
      const pushEnabled = providerData.preferences?.providers?.push !== false;
      if (pushEnabled) {
        await sendFCMPushToUser(providerId, providerData, {
          type: 'quote_received',
          title: notifTitle,
          body: notifBody,
          dealId,
          requestId,
          link: `/provider/quotes/${requestId}`,
        });
      }
    } catch (err) {
      console.error(`broadcastQuoteRequests: FCM error for provider ${providerId}:`, err);
    }
  }
}

/**
 * submitQuote — onCall
 *
 * Allows an assigned provider to submit (or update) a quote for a quote request.
 * Insurance and logistics payloads are validated separately.
 * On edit: updates existing quote document.
 * On new: creates quote in providerQuotes subcollection.
 *
 * @param {Object} data - { requestId, quoteData }
 * @returns {Promise<{ success: boolean }>}
 */
exports.submitQuote = onCall(async (request) => {
  const { requestId, quoteData } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!requestId || !quoteData) {
    throw new HttpsError('invalid-argument', 'requestId and quoteData are required.');
  }

  // Read the quote request
  const requestRef = db.collection('quoteRequests').doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Quote request not found.');
  }

  const quoteRequest = requestDoc.data();

  // Authorization: caller must be the assigned provider
  if (quoteRequest.providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the assigned provider for this request.');
  }

  // Status guard: only pending or quoted (edit scenario) allowed
  if (
    quoteRequest.status !== QUOTE_REQUEST_STATUS.PENDING &&
    quoteRequest.status !== QUOTE_REQUEST_STATUS.QUOTED
  ) {
    throw new HttpsError(
      'failed-precondition',
      `Cannot submit quote for a request with status '${quoteRequest.status}'.`
    );
  }

  // Deadline guard
  if (quoteRequest.deadline && quoteRequest.deadline.toMillis() <= Timestamp.now().toMillis()) {
    throw new HttpsError('failed-precondition', 'The quote request deadline has passed.');
  }

  // Normalize providerType: support both old ('insurance_provider') and new ('insurance') forms
  const rawProviderType = quoteRequest.providerType;
  const isInsurance = rawProviderType === ROLES.INSURANCE_PROVIDER || rawProviderType === 'insurance';
  const isLogistics = rawProviderType === ROLES.LOGISTICS_PROVIDER || rawProviderType === 'logistics';
  // Always store the short-form going forward
  const providerType = isInsurance ? 'insurance' : isLogistics ? 'logistics' : rawProviderType;

  const { validityHours, notes, currency } = quoteData;
  const finalCurrency = currency || 'USD';

  // Validate validityHours
  const allowedValidityHours = [12, 24, 48, 72];
  if (!validityHours || !allowedValidityHours.includes(Number(validityHours))) {
    throw new HttpsError('invalid-argument', 'validityHours must be 12, 24, 48, or 72.');
  }

  // Type-specific validation
  if (isInsurance) {
    // Support both flat (old) and nested (new Phase 14) cargoMarine format
    const cargo = quoteData.cargoMarine || quoteData;
    const { iccCoverage, premiumAmount, coverageAmount, deductiblePct, claimsPaymentDays, policyStartDate, policyEndDate, coverageScope } = cargo;
    if (!['A', 'B', 'C'].includes(iccCoverage)) {
      throw new HttpsError('invalid-argument', 'iccCoverage must be A, B, or C.');
    }
    if (!premiumAmount || Number(premiumAmount) <= 0) {
      throw new HttpsError('invalid-argument', 'premiumAmount must be greater than 0.');
    }
    if (!coverageAmount || Number(coverageAmount) <= 0) {
      throw new HttpsError('invalid-argument', 'coverageAmount must be greater than 0.');
    }
    if (deductiblePct === undefined || Number(deductiblePct) < 0 || Number(deductiblePct) > 100) {
      throw new HttpsError('invalid-argument', 'deductiblePct must be between 0 and 100.');
    }
    if (!claimsPaymentDays || Number(claimsPaymentDays) <= 0) {
      throw new HttpsError('invalid-argument', 'claimsPaymentDays must be greater than 0.');
    }
    if (!policyStartDate || !policyEndDate) {
      throw new HttpsError('invalid-argument', 'policyStartDate and policyEndDate are required.');
    }
    if (!coverageScope) {
      throw new HttpsError('invalid-argument', 'coverageScope is required.');
    }

    // Validate optional risk type sub-objects (Phase 14) when present
    if (quoteData.commercialRisk) {
      const cr = quoteData.commercialRisk;
      if (!cr.coverageLimit || Number(cr.coverageLimit) <= 0) {
        throw new HttpsError('invalid-argument', 'commercialRisk.coverageLimit must be > 0');
      }
      if (!cr.currency) {
        throw new HttpsError('invalid-argument', 'commercialRisk.currency is required');
      }
    }
    if (quoteData.politicalRisk) {
      const pr = quoteData.politicalRisk;
      if (!pr.coverageLimit || Number(pr.coverageLimit) <= 0) {
        throw new HttpsError('invalid-argument', 'politicalRisk.coverageLimit must be > 0');
      }
      if (!pr.currency) {
        throw new HttpsError('invalid-argument', 'politicalRisk.currency is required');
      }
      if (!pr.perils || !Array.isArray(pr.perils) || pr.perils.length === 0) {
        throw new HttpsError('invalid-argument', 'politicalRisk.perils must have at least one item');
      }
    }
    if (quoteData.claimsHandling) {
      if (!quoteData.claimsHandling.jurisdiction) {
        throw new HttpsError('invalid-argument', 'claimsHandling.jurisdiction is required');
      }
      if (!quoteData.claimsHandling.responseTime) {
        throw new HttpsError('invalid-argument', 'claimsHandling.responseTime is required');
      }
    }
    // quoteStatus defaults to indicative server-side if missing
    if (!quoteData.quoteStatus) {
      quoteData.quoteStatus = { status: 'indicative' };
    }
  } else if (isLogistics) {
    const { transportMode, freightCost, estimatedTransitDays, loadingDate, estimatedArrival } = quoteData;
    if (!['sea', 'air', 'road', 'rail', 'multimodal'].includes(transportMode)) {
      throw new HttpsError('invalid-argument', 'transportMode must be sea, air, road, rail, or multimodal.');
    }
    if (!freightCost || Number(freightCost) <= 0) {
      throw new HttpsError('invalid-argument', 'freightCost must be greater than 0.');
    }
    if (!estimatedTransitDays || Number(estimatedTransitDays) <= 0) {
      throw new HttpsError('invalid-argument', 'estimatedTransitDays must be greater than 0.');
    }
    if (!loadingDate || !estimatedArrival) {
      throw new HttpsError('invalid-argument', 'loadingDate and estimatedArrival are required.');
    }
  } else {
    throw new HttpsError('failed-precondition', `Unknown provider type: ${providerType}`);
  }

  // Compute validUntil
  const validUntil = Timestamp.fromMillis(Date.now() + Number(validityHours) * 60 * 60 * 1000);
  const now = Timestamp.now();

  // Build the quote document fields
  const quoteDocData = {
    requestId,
    dealId: quoteRequest.dealId,
    providerUid: uid,
    providerType,
    // Denormalized for Firestore rules (avoids get() call in rules)
    buyerId: quoteRequest.buyerId,
    sellerId: quoteRequest.sellerId,
    participants: [quoteRequest.buyerId, quoteRequest.sellerId, uid],
    ...quoteData,
    currency: finalCurrency,
    validUntil,
    status: QUOTE_STATUS.ACTIVE,
    updatedAt: now,
  };

  // Check if a quote already exists for this request/provider
  const existingQuotesSnap = await db
    .collection('quoteRequests')
    .doc(requestId)
    .collection('providerQuotes')
    .where('providerUid', '==', uid)
    .limit(1)
    .get();

  if (!existingQuotesSnap.empty) {
    // UPDATE existing quote
    await existingQuotesSnap.docs[0].ref.update(quoteDocData);
  } else {
    // CREATE new quote
    quoteDocData.createdAt = now;
    await db
      .collection('quoteRequests')
      .doc(requestId)
      .collection('providerQuotes')
      .add(quoteDocData);
  }

  // Update quoteRequest status to 'quoted'
  await requestRef.update({
    status: QUOTE_REQUEST_STATUS.QUOTED,
    updatedAt: now,
  });

  // Notify buyer of new/updated quote (in-app + push + email)
  try {
    const buyerId = quoteRequest.buyerId;
    const providerLabel = providerType === 'insurance' ? 'insurance' : 'logistics';
    const notifTitle = 'New quote received for your deal';
    const notifBody = `A ${providerLabel} provider has submitted a quote for your deal.`;
    const dealLink = `/deals/${quoteRequest.dealId}`;

    // a) Firestore in-app notification
    await db.collection('users').doc(buyerId).collection('notifications').add({
      type: 'quote',
      eventType: 'quote_received',
      title: notifTitle,
      body: notifBody,
      dealId: quoteRequest.dealId,
      requestId,
      isRead: false,
      createdAt: now,
      link: dealLink,
    });

    // b) FCM push + c) email — "Deals" preference covers quote updates
    const buyerDoc = await db.collection('users').doc(buyerId).get();
    if (buyerDoc.exists) {
      const buyerData = buyerDoc.data();

      if (buyerData.preferences?.deals?.push !== false) {
        await sendFCMPushToUser(buyerId, buyerData, {
          type: 'deal_event',
          title: notifTitle,
          body: notifBody,
          dealId: quoteRequest.dealId,
          click_action: dealLink,
        });
      }

      const emailEnabled = buyerData.preferences?.deals?.email !== false;
      if (buyerData.email && emailEnabled) {
        const htmlBody = buildBrandedEmailHtml(
          `<p style="margin:0 0 16px 0;">${notifBody}</p>`,
          'View Deal',
          `${APP_URL}${dealLink}`
        );
        await sendDealEmail(buyerData.email, notifTitle, htmlBody);
      }
    }
  } catch (err) {
    console.error('submitQuote: failed to send buyer notification (non-fatal):', err);
  }

  console.log(`submitQuote: ${uid} submitted quote for request ${requestId} (deal: ${quoteRequest.dealId})`);
  return { success: true };
});

/**
 * acceptQuote — onCall
 *
 * Allows the buyer to accept a provider quote. Uses runTransaction with
 * server-side validUntil expiry check (QUOTE-04).
 *
 * Updates:
 * - quote.status → 'accepted'
 * - quoteRequest.status → 'selected'
 * - deal.selectedInsuranceQuoteId / selectedInsuranceRequestId  (or logistics equivalent)
 *
 * @param {Object} data - { quoteRequestId, quoteId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.acceptQuote = onCall(async (request) => {
  const { quoteRequestId, quoteId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!quoteRequestId || !quoteId) {
    throw new HttpsError('invalid-argument', 'quoteRequestId and quoteId are required.');
  }

  const quoteRequestRef = db.collection('quoteRequests').doc(quoteRequestId);
  const quoteRef = quoteRequestRef.collection('providerQuotes').doc(quoteId);

  let providerType;
  let dealId;

  await db.runTransaction(async (t) => {
    const [quoteRequestSnap, quoteSnap] = await Promise.all([
      t.get(quoteRequestRef),
      t.get(quoteRef),
    ]);

    if (!quoteRequestSnap.exists) throw new HttpsError('not-found', 'Quote request not found.');
    if (!quoteSnap.exists) throw new HttpsError('not-found', 'Quote not found.');

    const quoteRequest = quoteRequestSnap.data();
    const quote = quoteSnap.data();

    // Authorization: only the buyer can accept
    if (quoteRequest.buyerId !== uid) {
      throw new HttpsError('permission-denied', 'Only the buyer can accept a quote.');
    }

    // SERVER-SIDE EXPIRY CHECK (QUOTE-04)
    if (quote.validUntil.toMillis() <= Timestamp.now().toMillis()) {
      throw new HttpsError('failed-precondition', 'This quote has expired.');
    }

    // Status guard
    if (quote.status !== QUOTE_STATUS.ACTIVE) {
      throw new HttpsError(
        'failed-precondition',
        `Quote is ${quote.status}. Only active quotes can be accepted.`
      );
    }

    providerType = quote.providerType;
    dealId = quoteRequest.dealId;

    const dealRef = db.collection('deals').doc(dealId);
    const now = Timestamp.now();

    // Update quote status to accepted
    t.update(quoteRef, { status: QUOTE_STATUS.ACCEPTED, updatedAt: now });

    // Update quoteRequest status to selected
    t.update(quoteRequestRef, { status: QUOTE_REQUEST_STATUS.SELECTED, updatedAt: now });

    // Update deal with selected quote reference
    // Support both old ('insurance_provider') and new ('insurance') providerType values
    const dealUpdate = { updatedAt: now };
    if (providerType === ROLES.INSURANCE_PROVIDER || providerType === 'insurance') {
      dealUpdate.selectedInsuranceQuoteId = quoteId;
      dealUpdate.selectedInsuranceRequestId = quoteRequestId;
    } else {
      dealUpdate.selectedLogisticsQuoteId = quoteId;
      dealUpdate.selectedLogisticsRequestId = quoteRequestId;
    }
    t.update(dealRef, dealUpdate);
  });

  // Post-transaction notifications
  const now = Timestamp.now();
  if (dealId) {
    try {
      // Notify winning provider
      const quoteSnap = await quoteRef.get();
      const quoteData = quoteSnap.data();
      if (quoteData) {
        await db
          .collection('users')
          .doc(quoteData.providerUid)
          .collection('notifications')
          .add({
            type: 'quote',
            eventType: 'quote_accepted',
            title: 'Your quote has been accepted!',
            body: `The buyer has accepted your ${(providerType === ROLES.INSURANCE_PROVIDER || providerType === 'insurance') ? 'insurance' : 'logistics'} quote.`,
            dealId,
            requestId: quoteRequestId,
            quoteId,
            isRead: false,
            createdAt: now,
            link: `/deals/${dealId}`,
          });
      }
    } catch (err) {
      console.error('acceptQuote: failed to send provider notification (non-fatal):', err);
    }
  }

  console.log(`acceptQuote: buyer ${uid} accepted quote ${quoteId} on request ${quoteRequestId}`);
  return { success: true };
});

/**
 * declineQuoteRequest — onCall
 *
 * Allows an assigned provider to decline a pending quote request.
 * Can only decline while status is 'pending' (before submitting a quote).
 *
 * @param {Object} data - { requestId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.declineQuoteRequest = onCall(async (request) => {
  const { requestId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId is required.');

  const requestRef = db.collection('quoteRequests').doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) throw new HttpsError('not-found', 'Quote request not found.');

  const quoteRequest = requestDoc.data();

  // Authorization
  if (quoteRequest.providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the assigned provider for this request.');
  }

  // Status guard: can only decline pending requests
  if (quoteRequest.status !== QUOTE_REQUEST_STATUS.PENDING) {
    throw new HttpsError(
      'failed-precondition',
      `Cannot decline a request with status '${quoteRequest.status}'. Only pending requests can be declined.`
    );
  }

  await requestRef.update({
    status: QUOTE_REQUEST_STATUS.DECLINED,
    updatedAt: Timestamp.now(),
  });

  console.log(`declineQuoteRequest: provider ${uid} declined request ${requestId}`);
  return { success: true };
});

/**
 * withdrawQuote — onCall
 *
 * Allows a provider to withdraw their active quote, reverting the request
 * to 'pending' so they may submit a new one.
 *
 * @param {Object} data - { requestId, quoteId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.withdrawQuote = onCall(async (request) => {
  const { requestId, quoteId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!requestId || !quoteId) {
    throw new HttpsError('invalid-argument', 'requestId and quoteId are required.');
  }

  const requestRef = db.collection('quoteRequests').doc(requestId);
  const quoteRef = requestRef.collection('providerQuotes').doc(quoteId);

  const [requestDoc, quoteDoc] = await Promise.all([
    requestRef.get(),
    quoteRef.get(),
  ]);

  if (!requestDoc.exists) throw new HttpsError('not-found', 'Quote request not found.');
  if (!quoteDoc.exists) throw new HttpsError('not-found', 'Quote not found.');

  const quoteRequest = requestDoc.data();
  const quote = quoteDoc.data();

  // Authorization
  if (quoteRequest.providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the assigned provider for this request.');
  }

  // Status guard: can only withdraw active quotes
  if (quote.status !== QUOTE_STATUS.ACTIVE) {
    throw new HttpsError(
      'failed-precondition',
      `Quote is ${quote.status}. Only active quotes can be withdrawn.`
    );
  }

  const now = Timestamp.now();

  // Update quote status to withdrawn
  await quoteRef.update({ status: QUOTE_STATUS.WITHDRAWN, updatedAt: now });

  // Revert request status back to pending
  await requestRef.update({ status: QUOTE_REQUEST_STATUS.PENDING, updatedAt: now });

  console.log(`withdrawQuote: provider ${uid} withdrew quote ${quoteId} for request ${requestId}`);
  return { success: true };
});

/**
 * confirmProviderSelection — onCall
 *
 * Allows the buyer to confirm their provider selections, advancing the deal
 * to 'providers_selected' status. Requires at least one selected provider.
 *
 * After transaction: marks non-selected quoteRequests as 'not_selected' in batch.
 * Notifies all providers of outcome.
 *
 * @param {Object} data - { dealId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.confirmProviderSelection = onCall(async (request) => {
  const { dealId, skippedInsurance = false, skippedLogistics = false } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId) throw new HttpsError('invalid-argument', 'dealId is required.');

  const dealRef = db.collection('deals').doc(dealId);
  let deal;

  await db.runTransaction(async (t) => {
    const dealSnap = await t.get(dealRef);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');

    deal = dealSnap.data();

    // Authorization: only the buyer can confirm
    if (deal.buyerId !== uid) {
      throw new HttpsError('permission-denied', 'Only the buyer can confirm provider selections.');
    }

    // Status guard — allow both CONTRACT_APPROVED (first confirm) and PROVIDERS_SELECTED (re-confirm after managing providers)
    if (deal.status !== DEAL_STATUS.CONTRACT_APPROVED && deal.status !== DEAL_STATUS.PROVIDERS_SELECTED) {
      throw new HttpsError(
        'failed-precondition',
        `Deal is ${deal.status}. Provider selection requires deal status 'contract_approved' or 'providers_selected'.`
      );
    }

    // At least one section must be satisfied (selected or explicitly skipped)
    const insuranceSatisfied = !!deal.selectedInsuranceQuoteId || skippedInsurance;
    const logisticsSatisfied = !!deal.selectedLogisticsQuoteId || skippedLogistics;
    if (!insuranceSatisfied && !logisticsSatisfied) {
      throw new HttpsError(
        'failed-precondition',
        'At least one provider (insurance or logistics) must be selected or skipped before confirming.'
      );
    }

    const now = Timestamp.now();
    t.update(dealRef, {
      status: DEAL_STATUS.PROVIDERS_SELECTED,
      ...(skippedInsurance && { skippedInsurance: true }),
      ...(skippedLogistics && { skippedLogistics: true }),
      updatedAt: now,
    });
  });

  // Post-transaction: mark non-selected quoteRequests as not_selected (batch)
  // Skip marking requests for sections the buyer explicitly skipped —
  // those providers can still submit quotes and the buyer can return later.
  try {
    const allRequestsSnap = await db
      .collection('quoteRequests')
      .where('dealId', '==', dealId)
      .get();

    if (!allRequestsSnap.empty) {
      const now = Timestamp.now();
      const batch = db.batch();
      const selectedRequestIds = [
        deal.selectedInsuranceRequestId,
        deal.selectedLogisticsRequestId,
      ].filter(Boolean);

      // Only mark requests as not_selected for sections where a provider was ACTUALLY selected.
      // Skipped sections and untouched sections: leave their requests as-is.
      const hasSelectedInsurance = !!deal.selectedInsuranceQuoteId;
      const hasSelectedLogistics = !!deal.selectedLogisticsQuoteId;

      for (const reqDoc of allRequestsSnap.docs) {
        const reqData = reqDoc.data();

        // Only mark insurance requests if an insurance provider was selected
        if (reqData.providerType === 'insurance' && !hasSelectedInsurance) continue;
        // Only mark logistics requests if a logistics provider was selected
        if (reqData.providerType === 'logistics' && !hasSelectedLogistics) continue;

        if (
          !selectedRequestIds.includes(reqDoc.id) &&
          reqData.status !== QUOTE_REQUEST_STATUS.SELECTED &&
          reqData.status !== QUOTE_REQUEST_STATUS.DECLINED
        ) {
          batch.update(reqDoc.ref, {
            status: QUOTE_REQUEST_STATUS.NOT_SELECTED,
            updatedAt: now,
          });
        }
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('confirmProviderSelection: failed to mark non-selected requests (non-fatal):', err);
  }

  // Post-transaction notifications (non-blocking)
  if (deal) {
    try {
      const allRequestsSnap = await db
        .collection('quoteRequests')
        .where('dealId', '==', dealId)
        .get();

      const now = Timestamp.now();
      const selectedRequestIds = [
        deal.selectedInsuranceRequestId,
        deal.selectedLogisticsRequestId,
      ].filter(Boolean);

      for (const reqDoc of allRequestsSnap.docs) {
        const reqData = reqDoc.data();
        const isSelected = selectedRequestIds.includes(reqDoc.id);
        const eventType = isSelected ? 'quote_accepted' : 'quote_not_selected';
        const title = isSelected
          ? 'Your quote has been selected!'
          : 'A provider has been selected for this deal';
        const body = isSelected
          ? 'The buyer has confirmed your selection for this deal.'
          : 'The buyer has selected another provider for this deal.';

        try {
          await db
            .collection('users')
            .doc(reqData.providerUid)
            .collection('notifications')
            .add({
              type: 'quote',
              eventType,
              title,
              body,
              dealId,
              requestId: reqDoc.id,
              isRead: false,
              createdAt: now,
              link: `/deals/${dealId}`,
            });
        } catch (notifErr) {
          console.error(`confirmProviderSelection: failed to notify provider ${reqData.providerUid} (non-fatal):`, notifErr);
        }
      }
    } catch (err) {
      console.error('confirmProviderSelection: error sending provider notifications (non-fatal):', err);
    }
  }

  // Append status history for PROVIDERS_SELECTED transition (outside transaction)
  try {
    await appendStatusHistory(dealId, DEAL_STATUS.PROVIDERS_SELECTED, uid, '', 'Provider selections confirmed');
  } catch (err) {
    console.error('confirmProviderSelection: appendStatusHistory failed (non-fatal):', err);
  }

  console.log(`confirmProviderSelection: buyer ${uid} confirmed provider selections for deal ${dealId}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Shipment Tracking Cloud Functions (Phase 6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * submitShipmentUpdate — onCall
 *
 * Called by a logistics provider to post a shipment status update for a deal.
 * Authorization: caller must be the selected logistics provider (verified via quoteRequest).
 * Writes to deals/{dealId}/shipmentTracking subcollection.
 * If status === 'delivered': transitions deal.status to DELIVERED inside a transaction.
 * Sends notifications to deal buyer and seller.
 *
 * @param {Object} data - { dealId, status, note?, containerNumber?, trackingRef?, etaDate? }
 * @returns {Promise<{ success: boolean }>}
 */
exports.submitShipmentUpdate = onCall(async (request) => {
  const { dealId, status, note, containerNumber, trackingRef, etaDate } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !status) {
    throw new HttpsError('invalid-argument', 'dealId and status are required.');
  }

  // Validate status is a known logistics shipment status (not COVERAGE_ACTIVE — that's insurance-only)
  const allowedStatuses = Object.values(SHIPMENT_STATUS_CF).filter(
    (s) => s !== SHIPMENT_STATUS_CF.COVERAGE_ACTIVE
  );
  if (!allowedStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', `Invalid shipment status: ${status}. Must be one of: ${allowedStatuses.join(', ')}`);
  }

  // Fetch the deal
  const dealRef = db.collection('deals').doc(dealId);
  const dealSnap = await dealRef.get();
  if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
  const deal = dealSnap.data();

  // Authorization: verify caller is the selected logistics provider
  if (!deal.selectedLogisticsRequestId) {
    throw new HttpsError('failed-precondition', 'No logistics provider has been selected for this deal.');
  }
  const qrSnap = await db.collection('quoteRequests').doc(deal.selectedLogisticsRequestId).get();
  if (!qrSnap.exists) throw new HttpsError('not-found', 'Logistics quote request not found.');
  if (qrSnap.data().providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the selected logistics provider for this deal.');
  }

  // Look up actor display name for the tracking record
  let actorName = '';
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      actorName = userData.companyName || userData.displayName || '';
    }
  } catch (err) {
    console.error('submitShipmentUpdate: failed to look up actor name (non-fatal):', err);
  }

  const now = Timestamp.now();

  // Convert etaDate string to Timestamp if provided
  let etaTimestamp = null;
  if (etaDate) {
    try {
      etaTimestamp = Timestamp.fromDate(new Date(etaDate));
    } catch (err) {
      console.error('submitShipmentUpdate: invalid etaDate format (non-fatal):', err);
    }
  }

  // Write shipment update document to subcollection
  const updateData = {
    dealId,
    status,
    timestamp: now,
    actorId: uid,
    actorName,
    providerType: 'logistics',
    note: note || null,
    containerNumber: containerNumber || null,
    trackingRef: trackingRef || null,
    etaDate: etaTimestamp,
    dealBuyerId: deal.buyerId,
    dealSellerId: deal.sellerId,
    readers: [deal.buyerId, deal.sellerId, uid],
  };
  await db.collection('deals').doc(dealId).collection('shipmentTracking').add(updateData);

  // Denormalize current shipment status and ETA onto the deal doc for DealCard display
  const dealDenormUpdate = {
    currentShipmentStatus: status,
    updatedAt: now,
  };
  if (etaTimestamp) {
    dealDenormUpdate.shipmentEtaDate = etaTimestamp;
  }
  await dealRef.update(dealDenormUpdate);

  // If delivered: transition deal status to DELIVERED inside a transaction
  if (status === SHIPMENT_STATUS_CF.DELIVERED) {
    await db.runTransaction(async (t) => {
      const freshDealSnap = await t.get(dealRef);
      if (!freshDealSnap.exists) throw new HttpsError('not-found', 'Deal not found in transaction.');
      const freshDeal = freshDealSnap.data();

      const allowedNext = VALID_DEAL_TRANSITIONS_CF[freshDeal.status] || [];
      if (!allowedNext.includes(DEAL_STATUS.DELIVERED)) {
        throw new HttpsError(
          'failed-precondition',
          `Cannot transition deal from ${freshDeal.status} to delivered.`
        );
      }

      t.update(dealRef, {
        status: DEAL_STATUS.DELIVERED,
        updatedAt: Timestamp.now(),
      });
    });

    // Append status history for DELIVERED transition (outside transaction)
    try {
      await appendStatusHistory(dealId, DEAL_STATUS.DELIVERED, uid, actorName, 'Shipment delivered');
    } catch (err) {
      console.error('submitShipmentUpdate: appendStatusHistory (DELIVERED) failed (non-fatal):', err);
    }
  }

  // Notify deal buyer and seller
  try {
    await sendDealNotifications(dealId, 'shipment_update', 'system', deal);
  } catch (err) {
    console.error('submitShipmentUpdate: sendDealNotifications failed (non-fatal):', err);
  }

  console.log(`submitShipmentUpdate: provider ${uid} posted status '${status}' for deal ${dealId}`);
  return { success: true };
});

/**
 * confirmInsuranceCoverage — onCall
 *
 * Called by the selected insurance provider to confirm active coverage for a deal.
 * Uses a deterministic document ID (coverage_${dealId}) for idempotency —
 * re-calling after a successful confirmation returns an 'already-exists' error.
 * Authorization: caller must be the selected insurance provider (verified via quoteRequest).
 *
 * @param {Object} data - { dealId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.confirmInsuranceCoverage = onCall(async (request) => {
  const { dealId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId) throw new HttpsError('invalid-argument', 'dealId is required.');

  // Fetch the deal
  const dealSnap = await db.collection('deals').doc(dealId).get();
  if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
  const deal = dealSnap.data();

  // Authorization: verify caller is the selected insurance provider
  if (!deal.selectedInsuranceRequestId) {
    throw new HttpsError('failed-precondition', 'No insurance provider has been selected for this deal.');
  }
  const qrSnap = await db.collection('quoteRequests').doc(deal.selectedInsuranceRequestId).get();
  if (!qrSnap.exists) throw new HttpsError('not-found', 'Insurance quote request not found.');
  if (qrSnap.data().providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the selected insurance provider for this deal.');
  }

  // Look up actor display name
  let actorName = '';
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      actorName = userData.companyName || userData.displayName || '';
    }
  } catch (err) {
    console.error('confirmInsuranceCoverage: failed to look up actor name (non-fatal):', err);
  }

  // Idempotency check: use deterministic document ID to prevent duplicate coverage confirmations
  const coverageDocId = `coverage_${dealId}`;
  const coverageRef = db.collection('deals').doc(dealId).collection('shipmentTracking').doc(coverageDocId);

  await db.runTransaction(async (t) => {
    const existingSnap = await t.get(coverageRef);
    if (existingSnap.exists) {
      throw new HttpsError('already-exists', 'Insurance coverage has already been confirmed for this deal.');
    }

    const now = Timestamp.now();
    t.set(coverageRef, {
      dealId,
      status: SHIPMENT_STATUS_CF.COVERAGE_ACTIVE,
      timestamp: now,
      actorId: uid,
      actorName,
      providerType: 'insurance',
      note: 'Coverage confirmed',
      containerNumber: null,
      trackingRef: null,
      etaDate: null,
      dealBuyerId: deal.buyerId,
      dealSellerId: deal.sellerId,
      readers: [deal.buyerId, deal.sellerId, uid],
    });
  });

  // Notify deal buyer and seller
  try {
    await sendDealNotifications(dealId, 'insurance_coverage', 'system', deal);
  } catch (err) {
    console.error('confirmInsuranceCoverage: sendDealNotifications failed (non-fatal):', err);
  }

  console.log(`confirmInsuranceCoverage: provider ${uid} confirmed coverage for deal ${dealId}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-Update Fair Statuses
 *
 * Runs twice daily (midnight and noon UTC) to automatically update
 * fair statuses based on their start/end dates.
 *
 * Status logic (mirrors Fair.calculateStatus()):
 * - now < startDate → "upcoming"
 * - startDate <= now <= endDate → "ongoing"
 * - now > endDate → "past"
 */
exports.updateFairStatuses = onSchedule(
  {
    schedule: '0 0,12 * * *',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('🔄 Running fair status update...');

    try {
      const fairsSnapshot = await db.collection('fairs').get();

      if (fairsSnapshot.empty) {
        console.log('No fairs found.');
        return;
      }

      const now = new Date();
      const batch = db.batch();
      let updatedCount = 0;

      fairsSnapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);

        let correctStatus;
        if (now < startDate) {
          correctStatus = 'upcoming';
        } else if (now >= startDate && now <= endDate) {
          correctStatus = 'ongoing';
        } else {
          correctStatus = 'past';
        }

        if (data.status !== correctStatus) {
          console.log(`📝 Fair "${data.name || doc.id}": ${data.status} → ${correctStatus}`);
          batch.update(doc.ref, {
            status: correctStatus,
            updatedAt: Timestamp.now(),
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Updated ${updatedCount} fair(s).`);
      } else {
        console.log('✅ All fair statuses are already correct.');
      }
    } catch (error) {
      console.error('❌ Error updating fair statuses:', error);
      throw error;
    }
  }
);

/**
 * checkExpiredOffers
 *
 * Runs every 30 minutes. Queries all open offers past their expiresAt deadline
 * and transitions them (and their parent deal) to 'expired' status via batched write.
 *
 * The composite index on collectionGroup('offers') for status + expiresAt was
 * added in Plan 01's firestore.indexes.json.
 */
exports.checkExpiredOffers = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('checkExpiredOffers: running...');

    try {
      const now = Timestamp.now();

      // Query all open offers that have passed their expiry deadline
      const expiredOffersSnap = await db
        .collectionGroup('offers')
        .where('status', '==', OFFER_STATUS.OPEN)
        .where('expiresAt', '<=', now)
        .get();

      if (expiredOffersSnap.empty) {
        console.log('checkExpiredOffers: no expired offers found.');
        return;
      }

      const batch = db.batch();
      const expiredDealIds = new Set();

      expiredOffersSnap.forEach((offerDoc) => {
        const dealId = offerDoc.ref.parent.parent.id;

        // Update offer status to expired
        batch.update(offerDoc.ref, {
          status: OFFER_STATUS.EXPIRED,
          updatedAt: now,
        });

        // Track unique deal IDs that need updating (avoid double-writing)
        expiredDealIds.add(dealId);
      });

      // Update each deal's status to expired
      for (const dealId of expiredDealIds) {
        const dealRef = db.collection('deals').doc(dealId);
        batch.update(dealRef, {
          status: DEAL_STATUS.EXPIRED,
          updatedAt: now,
        });
      }

      await batch.commit();

      console.log(
        `checkExpiredOffers: expired ${expiredOffersSnap.size} offer(s) across ${expiredDealIds.size} deal(s).`
      );
    } catch (error) {
      console.error('checkExpiredOffers: error:', error);
      throw error;
    }
  }
);

/**
 * sendExpiryReminders
 *
 * Runs every 30 minutes alongside checkExpiredOffers logic.
 * Sends reminder notifications at 24h, 4h, and 1h before offer expiry.
 * Uses remindersSet array on offer doc to prevent duplicate reminders.
 * Notifies both the receiver (currentTurnUid) and the sender as an FYI.
 */
exports.sendExpiryReminders = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('sendExpiryReminders: running...');

    try {
      const now = Date.now();

      // Define 3 reminder windows with 30-min buffer (matching schedule interval)
      const reminderWindows = [
        {
          level: '24h',
          minMs: 23 * 60 * 60 * 1000,       // now + 23h
          maxMs: 24.5 * 60 * 60 * 1000,     // now + 24h30m
          label: '24 hours',
        },
        {
          level: '4h',
          minMs: 3.5 * 60 * 60 * 1000,      // now + 3h30m
          maxMs: 4.5 * 60 * 60 * 1000,      // now + 4h30m
          label: '4 hours',
        },
        {
          level: '1h',
          minMs: 30 * 60 * 1000,             // now + 30m
          maxMs: 1.5 * 60 * 60 * 1000,      // now + 1h30m
          label: '1 hour',
        },
      ];

      for (const window of reminderWindows) {
        const minExpiry = Timestamp.fromMillis(now + window.minMs);
        const maxExpiry = Timestamp.fromMillis(now + window.maxMs);

        const offersSnap = await db
          .collectionGroup('offers')
          .where('status', '==', OFFER_STATUS.OPEN)
          .where('expiresAt', '>=', minExpiry)
          .where('expiresAt', '<=', maxExpiry)
          .get();

        if (offersSnap.empty) continue;

        for (const offerDoc of offersSnap.docs) {
          const offer = offerDoc.data();

          // Skip if this reminder level was already sent
          const remindersSet = offer.remindersSet || [];
          if (remindersSet.includes(window.level)) continue;

          const dealId = offerDoc.ref.parent.parent.id;
          const dealDoc = await db.collection('deals').doc(dealId).get();
          if (!dealDoc.exists) continue;
          const deal = dealDoc.data();

          // Mark reminder as sent (arrayUnion prevents race conditions)
          await offerDoc.ref.update({
            remindersSet: FieldValue.arrayUnion(window.level),
          });

          const productName = deal.productName || 'this product';

          // Notify the receiver (the party whose turn it is to respond)
          const receiverUid = deal.currentTurnUid;
          // Also notify the sender (FYI — opposite of currentTurnUid)
          const senderUid = receiverUid === deal.buyerId ? deal.sellerId : deal.buyerId;

          const notifyUids = [receiverUid, senderUid].filter(Boolean);

          for (const notifyUid of notifyUids) {
            const isReceiver = notifyUid === receiverUid;
            const titleText = isReceiver
              ? `Action needed: Offer expiring in ${window.label} on ${productName}`
              : `FYI: Your offer on ${productName} expires in ${window.label}`;
            const bodyText = isReceiver
              ? `The current offer on ${productName} expires in approximately ${window.label}. Take action before it expires.`
              : `Your offer on ${productName} expires in approximately ${window.label}.`;

            // In-app notification
            try {
              await db
                .collection('users')
                .doc(notifyUid)
                .collection('notifications')
                .add({
                  type: 'deal',
                  eventType: 'expiry_reminder',
                  title: titleText,
                  body: bodyText,
                  dealId,
                  dealProductName: productName,
                  reminderLevel: window.level,
                  isRead: false,
                  createdAt: Timestamp.now(),
                  link: `/deals/${dealId}`,
                });
            } catch (err) {
              console.error(`sendExpiryReminders: in-app notification failed for ${notifyUid}:`, err);
            }

            // Email notification
            try {
              const userDoc = await db.collection('users').doc(notifyUid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.email) {
                  const subject = isReceiver
                    ? `Offer expiring in ${window.label} on ${productName}`
                    : `Your offer on ${productName} expires in ${window.label}`;
                  const dealUrl = `${APP_URL}/deals/${dealId}`;
                  const htmlBody = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
                      <div style="background: #0F1B2B; padding: 24px; border-radius: 8px 8px 0 0;">
                        <h1 style="color: #FFD700; margin: 0; font-size: 20px;">CoreTradeGlobal</h1>
                      </div>
                      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6;">${bodyText}</p>
                        <div style="margin-top: 32px;">
                          <a href="${dealUrl}"
                             style="display: inline-block; background: #0F1B2B; color: #FFD700; text-decoration: none;
                                    padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
                            View Deal
                          </a>
                        </div>
                      </div>
                    </div>
                  `;
                  await sendDealEmail(userData.email, subject, htmlBody);
                }
              }
            } catch (err) {
              console.error(`sendExpiryReminders: email failed for ${notifyUid}:`, err);
            }
          }

          console.log(
            `sendExpiryReminders: sent ${window.level} reminder for offer ${offerDoc.id} on deal ${dealId}`
          );
        }
      }

      console.log('sendExpiryReminders: complete.');
    } catch (error) {
      console.error('sendExpiryReminders: error:', error);
      throw error;
    }
  }
);

/**
 * checkExpiredQuotes
 *
 * Runs every 30 minutes. Expires overdue quote requests (deadline passed without response)
 * and active provider quotes whose validUntil has passed.
 *
 * Uses batch writes (not transactions) for bulk updates — same pattern as checkExpiredOffers.
 */
exports.checkExpiredQuotes = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('checkExpiredQuotes: running...');

    try {
      const now = Timestamp.now();
      let expiredRequestCount = 0;
      let expiredQuoteCount = 0;


      // 1. Expire overdue quote requests (pending, deadline <= now)
      const expiredRequestsSnap = await db
        .collection('quoteRequests')
        .where('status', '==', QUOTE_REQUEST_STATUS.PENDING)
        .where('deadline', '<=', now)
        .get();

      if (!expiredRequestsSnap.empty) {
        const requestBatch = db.batch();
        expiredRequestsSnap.forEach((doc) => {
          requestBatch.update(doc.ref, {
            status: QUOTE_REQUEST_STATUS.DECLINED,
            updatedAt: now,
          });
          expiredRequestCount++;
        });
        await requestBatch.commit();
      }

      // 2. Expire active provider quotes whose validUntil has passed
      const expiredQuotesSnap = await db
        .collectionGroup('providerQuotes')
        .where('status', '==', QUOTE_STATUS.ACTIVE)
        .where('validUntil', '<=', now)
        .get();

      if (!expiredQuotesSnap.empty) {
        const quoteBatch = db.batch();
        expiredQuotesSnap.forEach((doc) => {
          quoteBatch.update(doc.ref, {
            status: QUOTE_STATUS.EXPIRED,
            updatedAt: now,
          });
          expiredQuoteCount++;
        });
        await quoteBatch.commit();
      }

      console.log(
        `checkExpiredQuotes: expired ${expiredRequestCount} request(s), ${expiredQuoteCount} quote(s).`
      );
    } catch (error) {
      console.error('checkExpiredQuotes: error:', error);
      throw error;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Legal Consulting Cloud Functions (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getLegalEventTitle — returns a short notification title for a legal event type.
 *
 * @param {string} eventType
 * @returns {string}
 */
function getLegalEventTitle(eventType) {
  const map = {
    hire_request: 'New legal consultation request',
    hire_accepted: 'Legal consultation accepted',
    hire_declined: 'Legal consultation declined',
    engagement_completed: 'Legal consultation completed',
    new_message_from_lawyer: 'New message from your lawyer',
    new_message_from_client: 'New message from your client',
    new_draft: 'New contract draft shared',
    risk_update: 'Risk assessment updated',
    draft_approved: 'Contract draft approved',
  };
  return map[eventType] || 'Legal consultation update';
}

/**
 * getLegalEventBody — returns a notification body for a legal event type.
 *
 * @param {string} eventType
 * @param {string} dealProductName
 * @returns {string}
 */
function getLegalEventBody(eventType, dealProductName) {
  const name = dealProductName || 'your deal';
  const map = {
    hire_request: `A client has requested your legal services for ${name}.`,
    hire_accepted: `Your legal consultation request for ${name} has been accepted.`,
    hire_declined: `Your legal consultation request for ${name} has been declined. You can hire another lawyer.`,
    engagement_completed: `The legal consultation session for ${name} has ended.`,
    new_message_from_lawyer: `Your lawyer sent a message regarding ${name}.`,
    new_message_from_client: `Your client sent a message regarding ${name}.`,
    new_draft: `A new contract draft has been shared for ${name}.`,
    risk_update: `The risk assessment for ${name} has been updated.`,
    draft_approved: `Your client has approved a contract draft for ${name}.`,
  };
  return map[eventType] || `There is a new update for your legal consultation on ${name}.`;
}

/**
 * sendLegalNotification — orchestrates in-app + email notification for legal events.
 *
 * Follows sendDealNotifications pattern: sends to a single recipient, non-blocking email.
 * IMPORTANT: Call this OUTSIDE transactions to prevent duplicate sends on transaction retries.
 *
 * @param {string} engagementId
 * @param {string} eventType - 'hire_request' | 'hire_accepted' | 'hire_declined' | 'engagement_completed' | 'new_message' | 'new_draft' | 'risk_update'
 * @param {string} recipientId - UID of the notification recipient
 * @param {string} dealProductName - denormalized product name for display
 * @param {string} dealId - for deep-linking notifications
 */
async function sendLegalNotification(engagementId, eventType, recipientId, dealProductName, dealId) {
  const title = getLegalEventTitle(eventType);
  const body = getLegalEventBody(eventType, dealProductName);
  const now = Timestamp.now();

  // --- a) Firestore in-app notification ---
  try {
    await db.collection('users').doc(recipientId).collection('notifications').add({
      type: 'legal',
      eventType,
      title,
      body,
      engagementId,
      dealId,
      isRead: false,
      createdAt: now,
      link: eventType === 'hire_request' ? '/lawyer/dashboard' : `/deals/${dealId}/legal`,
    });
  } catch (err) {
    console.error(`sendLegalNotification: failed to create in-app notification for ${recipientId}:`, err);
  }

  // --- b) Email notification (non-blocking) ---
  // Skip email for high-frequency or low-urgency events — in-app notification is sufficient
  const skipEmailEvents = ['engagement_closed', 'new_message_from_lawyer', 'new_message_from_client'];
  if (!skipEmailEvents.includes(eventType)) {
    try {
      const userDoc = await db.collection('users').doc(recipientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.email) {
          const subject = getLegalEventTitle(eventType);
          const legalUrl = `${APP_URL}/deals/${dealId}/legal`;
          const legalBody = getLegalEventBody(eventType, dealProductName);
          const htmlBody = buildBrandedEmailHtml(`<p style="margin:0 0 16px 0;">${legalBody}</p>`, 'View Legal Channel', legalUrl);
          await sendDealEmail(userData.email, subject, htmlBody).catch((err) =>
            console.error(`sendLegalNotification: email failed for ${recipientId}:`, err)
          );
        }
      }
    } catch (err) {
      console.error(`sendLegalNotification: error fetching user ${recipientId} for email:`, err);
    }
  }
}

/**
 * hireLayyer — onCall
 *
 * Allows a deal participant (buyer or seller) to request legal consulting from a lawyer.
 * Uses a deterministic engagement ID (${dealId}_${clientId}) to prevent duplicate
 * engagement documents for the same client on the same deal.
 *
 * Updates deal.lawyerIds via arrayUnion to grant lawyer read access via Firestore rules.
 *
 * @param {Object} data - { dealId, lawyerId }
 * @returns {Promise<{ engagementId: string, status: string }>}
 */
exports.hireLayyer = onCall(async (request) => {
  const { dealId, lawyerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !lawyerId) {
    throw new HttpsError('invalid-argument', 'dealId and lawyerId are required.');
  }

  // Fetch deal to verify caller is a participant
  const dealRef = db.collection('deals').doc(dealId);
  const dealDoc = await dealRef.get();
  if (!dealDoc.exists) throw new HttpsError('not-found', 'Deal not found.');

  const deal = dealDoc.data();
  if (uid !== deal.buyerId && uid !== deal.sellerId) {
    throw new HttpsError('permission-denied', 'You must be a deal participant to hire a lawyer.');
  }

  // Verify the target user is actually a lawyer
  const lawyerDoc = await db.collection('users').doc(lawyerId).get();
  if (!lawyerDoc.exists) throw new HttpsError('not-found', 'Lawyer not found.');
  const lawyerUser = lawyerDoc.data();
  if (lawyerUser.role !== ROLES.LAWYER) {
    throw new HttpsError('invalid-argument', 'The selected user is not a lawyer.');
  }

  // Fetch caller's display info
  const callerDoc = await db.collection('users').doc(uid).get();
  const callerUser = callerDoc.exists ? callerDoc.data() : {};

  // Deterministic engagement ID: prevents duplicate engagements per client per deal
  const engagementId = `${dealId}_${uid}`;
  const engagementRef = db.collection('legalEngagements').doc(engagementId);

  const now = Timestamp.now();
  const dealProductName = deal.productName || deal.product?.name || 'Deal';
  const clientDisplayName = callerUser.displayName || callerUser.companyName || 'Client';
  const lawyerDisplayName = lawyerUser.displayName || lawyerUser.companyName || 'Lawyer';

  // Atomic existence check + write in a transaction to prevent concurrent duplicate creation
  const result = await db.runTransaction(async (t) => {
    const existingDoc = await t.get(engagementRef);
    if (existingDoc.exists) {
      const existing = existingDoc.data();
      if (existing.status === ENGAGEMENT_STATUS.PENDING || existing.status === ENGAGEMENT_STATUS.ACTIVE) {
        throw new HttpsError(
          'already-exists',
          'You already have an active legal engagement for this deal.'
        );
      }
      // If completed or declined: allow re-hire (overwrite below)
    }

    t.set(engagementRef, {
      clientId: uid,
      lawyerId,
      dealId,
      participants: [uid, lawyerId],
      dealProductName,
      clientDisplayName,
      lawyerDisplayName,
      status: ENGAGEMENT_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    return { engagementId, status: ENGAGEMENT_STATUS.PENDING };
  });

  // Update deal to add lawyer to lawyerIds (side effect — outside transaction)
  await dealRef.update({
    lawyerIds: FieldValue.arrayUnion(lawyerId),
    updatedAt: now,
  });

  // Notify lawyer of hire request (outside transaction — non-duplicate pattern)
  await sendLegalNotification(engagementId, 'hire_request', lawyerId, dealProductName, dealId);

  console.log(`hireLayyer: engagement ${engagementId} created (client: ${uid}, lawyer: ${lawyerId})`);
  return result;
});

/**
 * respondToHireRequest — onCall
 *
 * Allows a lawyer to accept or decline a pending hire request.
 * Uses runTransaction to prevent concurrent accept/decline race conditions.
 * On accept: transitions to 'active' and posts a system message to legalMessages.
 * On decline: transitions to 'declined' (client can re-hire a different lawyer).
 *
 * @param {Object} data - { engagementId, action: 'accept' | 'decline' }
 * @returns {Promise<{ status: string }>}
 */
exports.respondToHireRequest = onCall(async (request) => {
  const { engagementId, action } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!engagementId || !action) {
    throw new HttpsError('invalid-argument', 'engagementId and action are required.');
  }
  if (action !== 'accept' && action !== 'decline') {
    throw new HttpsError('invalid-argument', 'action must be "accept" or "decline".');
  }

  let engagement;
  let newStatus;

  await db.runTransaction(async (t) => {
    const engagementRef = db.collection('legalEngagements').doc(engagementId);
    const engagementSnap = await t.get(engagementRef);

    if (!engagementSnap.exists) throw new HttpsError('not-found', 'Engagement not found.');

    engagement = engagementSnap.data();

    // Authorization: only the lawyer can respond
    if (engagement.lawyerId !== uid) {
      throw new HttpsError('permission-denied', 'Only the assigned lawyer can respond to this hire request.');
    }

    // Status guard: can only respond to pending requests
    if (engagement.status !== ENGAGEMENT_STATUS.PENDING) {
      throw new HttpsError(
        'failed-precondition',
        `Engagement is ${engagement.status}. Can only respond to pending requests.`
      );
    }

    newStatus = action === 'accept' ? ENGAGEMENT_STATUS.ACTIVE : ENGAGEMENT_STATUS.DECLINED;
    const now = Timestamp.now();

    t.update(engagementRef, {
      status: newStatus,
      updatedAt: now,
    });
  });

  // Post-transaction: add system message if accepted (outside transaction — non-duplicate pattern)
  if (action === 'accept' && engagement) {
    try {
      await db
        .collection('legalEngagements')
        .doc(engagementId)
        .collection('legalMessages')
        .add({
          type: 'system',
          content: 'Legal consulting session started. All conversations are encrypted and recorded.',
          senderId: 'system',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    } catch (err) {
      console.error('respondToHireRequest: failed to post system message (non-fatal):', err);
    }
  }

  // Notify client of lawyer's response (outside transaction)
  if (engagement) {
    const eventType = action === 'accept' ? 'hire_accepted' : 'hire_declined';
    await sendLegalNotification(
      engagementId,
      eventType,
      engagement.clientId,
      engagement.dealProductName,
      engagement.dealId
    );
  }

  console.log(`respondToHireRequest: engagement ${engagementId} → ${newStatus} (lawyer: ${uid})`);
  return { status: newStatus };
});

/**
 * closeLegalEngagement — onCall
 *
 * Allows either participant (client or lawyer) to close an active engagement.
 * Transitions status to 'completed' via runTransaction, adds a read-only system message,
 * and notifies the OTHER participant of the closure.
 *
 * @param {Object} data - { engagementId }
 * @returns {Promise<{ status: string }>}
 */
exports.closeLegalEngagement = onCall(async (request) => {
  const { engagementId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!engagementId) throw new HttpsError('invalid-argument', 'engagementId is required.');

  let engagement;

  await db.runTransaction(async (t) => {
    const engagementRef = db.collection('legalEngagements').doc(engagementId);
    const engagementSnap = await t.get(engagementRef);

    if (!engagementSnap.exists) throw new HttpsError('not-found', 'Engagement not found.');

    engagement = engagementSnap.data();

    // Authorization: caller must be a participant
    const participants = engagement.participants || [];
    if (!participants.includes(uid)) {
      throw new HttpsError('permission-denied', 'You are not a participant in this engagement.');
    }

    // Status guard: can only close active engagements
    if (engagement.status !== ENGAGEMENT_STATUS.ACTIVE) {
      throw new HttpsError(
        'failed-precondition',
        `Engagement is ${engagement.status}. Only active engagements can be closed.`
      );
    }

    t.update(engagementRef, {
      status: ENGAGEMENT_STATUS.COMPLETED,
      updatedAt: Timestamp.now(),
    });
  });

  // Post-transaction: add read-only system message (outside transaction — non-duplicate pattern)
  if (engagement) {
    try {
      await db
        .collection('legalEngagements')
        .doc(engagementId)
        .collection('legalMessages')
        .add({
          type: 'system',
          content: 'Legal consulting session ended. This channel is now read-only.',
          senderId: 'system',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    } catch (err) {
      console.error('closeLegalEngagement: failed to post system message (non-fatal):', err);
    }

    // Notify the OTHER participant
    const otherParticipantId = (engagement.participants || []).find((p) => p !== uid);
    if (otherParticipantId) {
      await sendLegalNotification(
        engagementId,
        'engagement_completed',
        otherParticipantId,
        engagement.dealProductName,
        engagement.dealId
      );
    }
  }

  console.log(`closeLegalEngagement: engagement ${engagementId} completed (closed by: ${uid})`);
  return { status: ENGAGEMENT_STATUS.COMPLETED };
});

/**
 * submitLawyerReview — onCall
 *
 * Allows a client to submit a review for a lawyer after the engagement is completed.
 * Validates engagement is completed before writing the review.
 * Writes review to users/{lawyerId}/reviews/{auto-id}.
 *
 * @param {Object} data - { engagementId, rating, comment? }
 *   rating: integer 1-5
 *   comment: optional string, max 1000 chars
 * @returns {Promise<{ success: boolean }>}
 */
exports.submitLawyerReview = onCall(async (request) => {
  const { engagementId, rating, comment } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!engagementId) throw new HttpsError('invalid-argument', 'engagementId is required.');

  // Validate rating
  const ratingInt = Number(rating);
  if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    throw new HttpsError('invalid-argument', 'rating must be an integer between 1 and 5.');
  }

  // Validate comment
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    throw new HttpsError('invalid-argument', 'comment must be a string.');
  }
  if (comment && comment.length > 1000) {
    throw new HttpsError('invalid-argument', 'comment must be 1000 characters or fewer.');
  }

  // Read engagement to verify status and caller identity
  const engagementDoc = await db.collection('legalEngagements').doc(engagementId).get();
  if (!engagementDoc.exists) throw new HttpsError('not-found', 'Engagement not found.');

  const engagement = engagementDoc.data();

  // Authorization: only the client can submit a review
  if (engagement.clientId !== uid) {
    throw new HttpsError('permission-denied', 'Only the client can submit a review for this engagement.');
  }

  // Status guard: engagement must be completed
  if (engagement.status !== ENGAGEMENT_STATUS.COMPLETED) {
    throw new HttpsError(
      'failed-precondition',
      'You can only review a lawyer after the engagement is completed.'
    );
  }

  // Fetch reviewer display name
  const reviewerDoc = await db.collection('users').doc(uid).get();
  const reviewerData = reviewerDoc.exists ? reviewerDoc.data() : {};
  const reviewerName = reviewerData.displayName || reviewerData.companyName || 'Anonymous';

  const reviewedAt = Timestamp.now();

  // Write review to lawyer's reviews subcollection
  await db.collection('users').doc(engagement.lawyerId).collection('reviews').add({
    reviewerId: uid,
    reviewerName,
    engagementId,
    dealId: engagement.dealId,
    rating: ratingInt,
    comment: comment || '',
    createdAt: reviewedAt,
  });

  // Mark engagement as reviewed to prevent duplicate submissions and hide the review banner
  await db.collection('legalEngagements').doc(engagementId).update({
    reviewedAt,
  });

  console.log(`submitLawyerReview: client ${uid} reviewed lawyer ${engagement.lawyerId} for engagement ${engagementId} (rating: ${ratingInt})`);
  return { success: true };
});

/**
 * approveLegalDraft — onCall
 *
 * Allows a client to approve the latest contract draft in an active engagement.
 * Copies draft metadata to the deal document as deal.legalContract so buyer/seller
 * can access the finalized contract through the deal.
 *
 * @param {Object} data - { engagementId, draftId }
 * @returns {Promise<{ success: boolean }>}
 */
exports.approveLegalDraft = onCall(async (request) => {
  const { engagementId, draftId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!engagementId || !draftId) {
    throw new HttpsError('invalid-argument', 'engagementId and draftId are required.');
  }

  // Read engagement
  const engagementDoc = await db.collection('legalEngagements').doc(engagementId).get();
  if (!engagementDoc.exists) throw new HttpsError('not-found', 'Engagement not found.');
  const engagement = engagementDoc.data();

  // Only client can approve
  if (engagement.clientId !== uid) {
    throw new HttpsError('permission-denied', 'Only the client can approve a draft.');
  }

  // Engagement must be active
  if (engagement.status !== ENGAGEMENT_STATUS.ACTIVE) {
    throw new HttpsError('failed-precondition', 'Engagement must be active to approve a draft.');
  }

  // Read the specific draft
  const draftDoc = await db.collection('legalEngagements').doc(engagementId)
    .collection('contractDrafts').doc(draftId).get();
  if (!draftDoc.exists) throw new HttpsError('not-found', 'Draft not found.');
  const draft = draftDoc.data();

  // Write draft info to deal document as legalContract
  const dealRef = db.collection('deals').doc(engagement.dealId);
  await dealRef.update({
    legalContract: {
      fileName: draft.fileName,
      fileUrl: draft.fileUrl,
      version: draft.version,
      approvedBy: uid,
      approvedAt: Timestamp.now(),
      engagementId,
      draftId,
    },
    updatedAt: Timestamp.now(),
  });

  // Mark draft as approved
  await db.collection('legalEngagements').doc(engagementId)
    .collection('contractDrafts').doc(draftId).update({
      approvedAt: Timestamp.now(),
      approvedBy: uid,
    });

  // System message in channel
  await db.collection('legalEngagements').doc(engagementId)
    .collection('legalMessages').add({
      senderId: 'system',
      senderName: 'System',
      content: `Contract draft v${draft.version} has been approved and applied to the deal.`,
      type: 'system',
      createdAt: Timestamp.now(),
    });

  // Notify lawyer
  await sendLegalNotification(engagementId, 'draft_approved', engagement.lawyerId, engagement.dealProductName, engagement.dealId);

  console.log(`approveLegalDraft: client ${uid} approved draft ${draftId} for engagement ${engagementId}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Legal Engagement — Firestore-Triggered Notification Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * onLegalMessageCreated
 *
 * Fires when a new document is created in legalEngagements/{engagementId}/legalMessages/{messageId}.
 * Notifies the OTHER participant (whoever didn't send the message).
 * System messages are excluded — they are generated by Cloud Functions that already send their own notifications.
 */
exports.onLegalMessageCreated = onDocumentCreated(
  'legalEngagements/{engagementId}/legalMessages/{messageId}',
  async (event) => {
    try {
      const engagementId = event.params.engagementId;
      const messageData = event.data?.data();
      if (!messageData) return;

      // Skip system messages — they trigger their own notifications
      if (messageData.type === 'system') return;

      // Read parent engagement to get participant IDs
      const engagementDoc = await db.collection('legalEngagements').doc(engagementId).get();
      if (!engagementDoc.exists) {
        console.error(`onLegalMessageCreated: engagement ${engagementId} not found`);
        return;
      }

      const engagement = engagementDoc.data();
      const { clientId, lawyerId, dealId, dealProductName } = engagement;
      const senderId = messageData.senderId;

      // Determine recipient: notify the other participant
      let recipientId;
      let messageEventType;
      if (senderId === clientId) {
        recipientId = lawyerId;
        messageEventType = 'new_message_from_client';
      } else if (senderId === lawyerId) {
        recipientId = clientId;
        messageEventType = 'new_message_from_lawyer';
      } else {
        console.error(`onLegalMessageCreated: senderId ${senderId} is not a participant of engagement ${engagementId}`);
        return;
      }

      await sendLegalNotification(engagementId, messageEventType, recipientId, dealProductName, dealId);
    } catch (err) {
      console.error('onLegalMessageCreated: unexpected error (non-fatal):', err);
    }
  }
);

/**
 * onContractDraftCreated
 *
 * Fires when a new document is created in legalEngagements/{engagementId}/contractDrafts/{draftId}.
 * Always notifies the client — drafts are uploaded by the lawyer per Firestore rules.
 */
exports.onContractDraftCreated = onDocumentCreated(
  'legalEngagements/{engagementId}/contractDrafts/{draftId}',
  async (event) => {
    try {
      const engagementId = event.params.engagementId;

      // Read parent engagement to get client info
      const engagementDoc = await db.collection('legalEngagements').doc(engagementId).get();
      if (!engagementDoc.exists) {
        console.error(`onContractDraftCreated: engagement ${engagementId} not found`);
        return;
      }

      const engagement = engagementDoc.data();
      const { clientId, dealId, dealProductName } = engagement;

      await sendLegalNotification(engagementId, 'new_draft', clientId, dealProductName, dealId);
    } catch (err) {
      console.error('onContractDraftCreated: unexpected error (non-fatal):', err);
    }
  }
);

/**
 * onRiskItemCreated
 *
 * Fires when a new document is created in legalEngagements/{engagementId}/riskItems/{riskId}.
 * Always notifies the client — risk items are created by the lawyer per Firestore rules.
 */
exports.onRiskItemCreated = onDocumentCreated(
  'legalEngagements/{engagementId}/riskItems/{riskId}',
  async (event) => {
    try {
      const engagementId = event.params.engagementId;

      // Read parent engagement to get client info
      const engagementDoc = await db.collection('legalEngagements').doc(engagementId).get();
      if (!engagementDoc.exists) {
        console.error(`onRiskItemCreated: engagement ${engagementId} not found`);
        return;
      }

      const engagement = engagementDoc.data();
      const { clientId, dealId, dealProductName } = engagement;

      await sendLegalNotification(engagementId, 'risk_update', clientId, dealProductName, dealId);
    } catch (err) {
      console.error('onRiskItemCreated: unexpected error (non-fatal):', err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Platform Event Triggers (Phase 12 Plan 04)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: send FCM push to a single user, with invalid token cleanup.
 * Non-blocking — caller must wrap in try/catch if needed.
 *
 * @param {string} uid - Recipient user ID
 * @param {Object} userData - Firestore user doc data (must contain fcmToken)
 * @param {Object} fcmData - Data payload for the FCM message (type, title, body, etc.)
 */
async function sendFCMPushToUser(uid, userData, fcmData) {
  const token = userData.fcmToken;
  if (!token) return;
  try {
    await messaging.send({
      token,
      data: fcmData,
    });
  } catch (err) {
    console.error(`sendFCMPushToUser: FCM error for ${uid}:`, err.code);
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      // Clean up invalid token so future sends are skipped
      await db.collection('users').doc(uid).update({ fcmToken: FieldValue.delete() });
    }
  }
}

/**
 * onNewMemberRegistered
 *
 * Fires when a new document is created in the users collection.
 * Only notifies admins when the new user has role='member'
 * (provider/lawyer accounts are invited and tracked via inviteUser CF).
 *
 * Channels: in-app notification + FCM push to all admins.
 * Preference check: preferences?.system?.push !== false (default true).
 */
exports.onNewMemberRegistered = onDocumentWritten(
  'users/{userId}',
  async (event) => {
    try {
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();
      if (!after) return; // deletion — skip

      // Only notify for member self-registrations
      if (after.role !== ROLES.MEMBER) return;

      // Idempotency: only notify when role FIRST becomes 'member', and only once.
      if (after._adminNotifiedAt) return;
      const beforeWasMember = before?.role === ROLES.MEMBER;
      if (beforeWasMember) return;

      const newUser = after;
      const newUserId = event.params.userId;
      const now = Timestamp.now();
      const displayName = newUser.displayName || newUser.email || 'A new member';
      const notifTitle = 'New Member Registered';
      const notifBody = `${displayName} has just registered as a member.`;

      // Email body (built once, shared across admins)
      const esc = (v) => String(v || '').replace(/[<>]/g, '');
      const emailInnerHtml = `
        <p style="margin:0 0 16px 0;">A new member has just registered and is awaiting your review.</p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#1a283b;">
          <tr><td style="padding:4px 16px 4px 0;color:#8899AA;">Name</td><td style="padding:4px 0;font-weight:bold;">${esc(newUser.displayName) || '—'}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#8899AA;">Company</td><td style="padding:4px 0;font-weight:bold;">${esc(newUser.companyName) || '—'}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#8899AA;">Email</td><td style="padding:4px 0;font-weight:bold;">${esc(newUser.email) || '—'}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#8899AA;">Country</td><td style="padding:4px 0;font-weight:bold;">${esc(newUser.country) || '—'}</td></tr>
        </table>`;

      // Query all admin users
      const adminsSnap = await db.collection('users').where('role', '==', ROLES.ADMIN).get();
      if (adminsSnap.empty) {
        console.log('onNewMemberRegistered: no admin users found');
        return;
      }

      for (const adminDoc of adminsSnap.docs) {
        const adminId = adminDoc.id;
        const adminData = adminDoc.data();

        // --- a) Firestore in-app notification ---
        try {
          await db.collection('users').doc(adminId).collection('notifications').add({
            type: 'new_user_approval',
            title: notifTitle,
            body: notifBody,
            newUserId,
            newUserName: displayName,
            isRead: false,
            createdAt: now,
            link: `/admin`,
          });
        } catch (err) {
          console.error(`onNewMemberRegistered: failed in-app notification for admin ${adminId}:`, err);
        }

        // --- b) FCM push notification (preference check) ---
        try {
          const pushEnabled = adminData.preferences?.system?.push !== false;
          if (pushEnabled) {
            await sendFCMPushToUser(adminId, adminData, {
              type: 'new_user_approval',
              title: notifTitle,
              body: notifBody,
              newUserId,
              link: '/admin',
            });
          }
        } catch (err) {
          console.error(`onNewMemberRegistered: FCM error for admin ${adminId}:`, err);
        }

        // --- c) Email notification (preference check) ---
        try {
          const emailEnabled = adminData.preferences?.system?.email !== false;
          const adminEmail = adminData.email;
          if (adminEmail && emailEnabled) {
            const htmlBody = buildBrandedEmailHtml(
              emailInnerHtml,
              'Review in Admin Panel',
              `${APP_URL}/admin`
            );
            await sendDealEmail(adminEmail, `New Member Registered — ${displayName}`, htmlBody);
          }
        } catch (err) {
          console.error(`onNewMemberRegistered: email error for admin ${adminId}:`, err);
        }
      }

      // Mark this user as already-notified so subsequent writes (e.g. profile
      // edits) don't re-fire the notification cascade.
      try {
        await db.collection('users').doc(newUserId).update({ _adminNotifiedAt: now });
      } catch (err) {
        console.error(`onNewMemberRegistered: failed to set _adminNotifiedAt for ${newUserId}:`, err);
      }

      console.log(`onNewMemberRegistered: notified ${adminsSnap.size} admin(s) of new member ${newUserId}`);
    } catch (err) {
      console.error('onNewMemberRegistered: unexpected error (non-fatal):', err);
    }
  }
);

/**
 * onRFQCreated
 *
 * Fires when a new document is created in the requests collection (RFQs).
 * Notifies all members with in-app + FCM push when a new RFQ is posted.
 * Does NOT notify the creator of the RFQ.
 *
 * Channels: in-app notification + FCM push to all members.
 * Preference check: preferences?.providers?.push !== false (default true).
 * Email: preferences?.providers?.email !== false (default true).
 */
exports.onRFQCreated = onDocumentCreated(
  'requests/{requestId}',
  async (event) => {
    try {
      const rfq = event.data?.data();
      if (!rfq) return;

      const requestId = event.params.requestId;
      const now = Timestamp.now();
      const productName = rfq.productName || rfq.title || 'a product';
      const creatorId = rfq.userId;

      const notifTitle = 'New RFQ Available';
      const notifBody = `A new request for quotation has been posted for ${productName}.`;

      // Query all members
      const membersSnap = await db.collection('users').where('role', '==', ROLES.MEMBER).get();
      if (membersSnap.empty) {
        console.log(`onRFQCreated: no members found for RFQ ${requestId}`);
        return;
      }

      for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;
        // Skip the creator of the RFQ
        if (memberId === creatorId) continue;

        const memberData = memberDoc.data();

        // --- a) Firestore in-app notification ---
        try {
          await db.collection('users').doc(memberId).collection('notifications').add({
            type: 'rfq_created',
            title: notifTitle,
            body: notifBody,
            requestId,
            productName,
            isRead: false,
            createdAt: now,
            link: `/request/${requestId}`,
          });
        } catch (err) {
          console.error(`onRFQCreated: failed in-app notification for member ${memberId}:`, err);
        }

        // --- b) FCM push notification (preference check) ---
        try {
          const pushEnabled = memberData.preferences?.providers?.push !== false;
          if (pushEnabled) {
            await sendFCMPushToUser(memberId, memberData, {
              type: 'rfq_created',
              title: notifTitle,
              body: notifBody,
              requestId,
              link: `/request/${requestId}`,
            });
          }
        } catch (err) {
          console.error(`onRFQCreated: FCM error for member ${memberId}:`, err);
        }

        // --- c) Email notification (preference check) ---
        try {
          const emailEnabled = memberData.preferences?.providers?.email !== false;
          const memberEmail = memberData.email;
          if (memberEmail && emailEnabled) {
            const rfqUrl = `${APP_URL}/request/${requestId}`;
            const htmlBody = buildBrandedEmailHtml(
              `<p style="margin:0 0 16px 0;">${notifBody}</p>`,
              'View RFQ',
              rfqUrl
            );
            await sendDealEmail(memberEmail, notifTitle, htmlBody);
          }
        } catch (err) {
          console.error(`onRFQCreated: email error for member ${memberId}:`, err);
        }
      }

      console.log(`onRFQCreated: notified ${membersSnap.size - 1} member(s) of new RFQ ${requestId}`);
    } catch (err) {
      console.error('onRFQCreated: unexpected error (non-fatal):', err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Admin Announcement System (Plan 12-05)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid audience values for announcements.
 */
const ANNOUNCEMENT_AUDIENCES = ['all', 'member', 'logistics_provider', 'insurance_provider', 'lawyer'];

/**
 * deliverAnnouncement
 *
 * Shared helper that delivers an announcement to all targeted users.
 * Called by sendAnnouncement (immediate) and processScheduledAnnouncements (scheduled).
 *
 * @param {Object} announcementData - Announcement fields: title, body, audience, channels
 * @param {string} announcementId - Firestore document ID
 * @returns {Promise<number>} recipientCount
 */
async function deliverAnnouncement(announcementData, announcementId) {
  const { title, body, audience, channels } = announcementData;
  const now = Timestamp.now();

  // Query target users
  let usersQuery = db.collection('users');
  if (audience !== 'all') {
    usersQuery = usersQuery.where('role', '==', audience);
  }
  const usersSnap = await usersQuery.get();

  if (usersSnap.empty) {
    console.log(`deliverAnnouncement(${announcementId}): no users found for audience=${audience}`);
    return 0;
  }

  let recipientCount = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();

    // Skip admin users from targeted announcements (admins get system notifications elsewhere)
    if (userData.role === ROLES.ADMIN) continue;

    // --- a) In-app notification ---
    if (channels?.inApp) {
      try {
        // Deterministic doc id (announcementId) makes delivery idempotent: a
        // re-run overwrites the same notification instead of creating a duplicate.
        await db.collection('users').doc(uid).collection('notifications').doc(announcementId).set({
          type: 'announcement',
          title,
          body,
          announcementId,
          isRead: false,
          createdAt: now,
          link: '/notifications',
        });
      } catch (err) {
        console.error(`deliverAnnouncement: in-app error for ${uid}:`, err);
      }
    }

    // --- b) FCM push notification (preference check) ---
    if (channels?.push) {
      try {
        const pushEnabled = userData.preferences?.system?.push !== false;
        if (pushEnabled) {
          await sendFCMPushToUser(uid, userData, {
            type: 'announcement',
            title,
            body,
            announcementId,
            link: '/notifications',
          });
        }
      } catch (err) {
        console.error(`deliverAnnouncement: FCM error for ${uid}:`, err);
      }
    }

    // --- c) Email notification (preference check) ---
    if (channels?.email) {
      try {
        const emailEnabled = userData.preferences?.system?.email !== false;
        const userEmail = userData.email;
        if (userEmail && emailEnabled) {
          const htmlBody = buildBrandedEmailHtml(
            `<p style="margin:0 0 16px 0;">${body}</p>`,
            'View Notifications',
            `${APP_URL}/notifications`
          );
          await sendDealEmail(userEmail, title, htmlBody);
        }
      } catch (err) {
        console.error(`deliverAnnouncement: email error for ${uid}:`, err);
      }
    }

    recipientCount++;
  }

  return recipientCount;
}

/**
 * sendAnnouncement (onCall)
 *
 * Admin-only callable function to send or schedule announcements.
 *
 * Accepts: { title, body, audience, channels: { inApp, push, email }, scheduledFor }
 * - If scheduledFor is a future ISO timestamp: store as pending announcement.
 * - Otherwise: deliver immediately across selected channels.
 *
 * Returns: { status: 'sent' | 'scheduled', recipientCount? }
 */
exports.sendAnnouncement = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const adminCheck = await isUserAdmin(auth.uid);
  if (!adminCheck) {
    throw new HttpsError('permission-denied', 'Only administrators can send announcements.');
  }

  const { title, body, audience, channels, scheduledFor } = request.data;

  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'title and body are required.');
  }
  if (!ANNOUNCEMENT_AUDIENCES.includes(audience)) {
    throw new HttpsError('invalid-argument', `audience must be one of: ${ANNOUNCEMENT_AUDIENCES.join(', ')}`);
  }
  if (!channels || (!channels.inApp && !channels.push && !channels.email)) {
    throw new HttpsError('invalid-argument', 'At least one channel (inApp, push, email) must be selected.');
  }

  const now = Timestamp.now();

  // Determine if this is a scheduled announcement
  const isScheduled =
    scheduledFor &&
    new Date(scheduledFor) > new Date();

  if (isScheduled) {
    // Write pending announcement for scheduled delivery
    const announcementRef = await db.collection('announcements').add({
      title,
      body,
      audience,
      channels,
      scheduledFor: Timestamp.fromDate(new Date(scheduledFor)),
      status: 'pending',
      createdBy: auth.uid,
      createdAt: now,
      sentAt: null,
      recipientCount: null,
    });

    console.log(`sendAnnouncement: scheduled for ${scheduledFor}, id=${announcementRef.id}`);
    return { status: 'scheduled', announcementId: announcementRef.id };
  }

  // Immediate delivery — write doc first, then deliver
  const announcementRef = await db.collection('announcements').add({
    title,
    body,
    audience,
    channels,
    scheduledFor: null,
    status: 'pending',
    createdBy: auth.uid,
    createdAt: now,
    sentAt: null,
    recipientCount: null,
  });

  try {
    const recipientCount = await deliverAnnouncement({ title, body, audience, channels }, announcementRef.id);
    await announcementRef.update({
      status: 'sent',
      sentAt: Timestamp.now(),
      recipientCount,
    });
    console.log(`sendAnnouncement: sent to ${recipientCount} recipient(s), id=${announcementRef.id}`);
    return { status: 'sent', recipientCount };
  } catch (err) {
    await announcementRef.update({ status: 'failed' });
    console.error(`sendAnnouncement: delivery failed for ${announcementRef.id}:`, err);
    throw new HttpsError('internal', 'Failed to deliver announcement.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Product Upload Cloud Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * bulkUploadProducts (onCall, admin only)
 *
 * Accepts an array of pre-validated product rows and a target userId (member).
 * For each row:
 *   1. Creates a product document in the `products` collection.
 *   2. Downloads each image URL (with 10s timeout) and stores in Firebase Storage.
 *   3. Updates the product's `images` array with successfully downloaded URLs.
 *
 * Rows are processed sequentially with a concurrency limit of 3 to avoid
 * overwhelming external image servers.
 *
 * @param {{ userId: string, rows: Array<{name, categoryId, price, currency, quantity, unit, description, imageUrls}> }}
 * @returns {{ created: number, skipped: number, errors: Array<{row: number, reason: string}> }}
 */
exports.bulkUploadProducts = onCall(
  { timeoutSeconds: 300 },
  async (request) => {
    const auth = request.auth;

    // Auth check — admin only
    if (!auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    if (auth.token?.role !== 'admin') {
      const adminCheck = await isUserAdmin(auth.uid);
      if (!adminCheck) {
        throw new HttpsError('permission-denied', 'Only administrators can bulk upload products.');
      }
    }

    const { userId, rows } = request.data;

    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required.');
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new HttpsError('invalid-argument', 'rows must be a non-empty array.');
    }
    if (rows.length > 500) {
      throw new HttpsError('invalid-argument', 'Maximum 500 rows per upload.');
    }

    // Verify target user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', `User ${userId} not found.`);
    }

    const bucket = admin.storage().bucket();
    let created = 0;
    let skipped = 0;
    const errors = [];

    /**
     * Download an image from a URL and upload it to Firebase Storage.
     * Returns the public download URL on success, or null on failure.
     */
    async function downloadAndStoreImage(imageUrl, userId, productId, index) {
      try {
        // Fetch image with 10-second timeout (Node 20 built-in fetch)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
          response = await fetch(imageUrl, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          console.warn(`bulkUploadProducts: image fetch failed (${response.status}) for ${imageUrl}`);
          return null;
        }

        // Determine file extension from Content-Type or URL
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('webp')) ext = 'webp';
        else {
          // Try to get extension from URL path
          const urlPath = new URL(imageUrl).pathname;
          const urlExt = urlPath.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExt)) {
            ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
          }
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const storagePath = `users/${userId}/products/${productId}/image_${index}.${ext}`;
        const fileRef = bucket.file(storagePath);

        await fileRef.save(buffer, {
          metadata: { contentType },
          public: true,
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        return publicUrl;
      } catch (err) {
        console.warn(`bulkUploadProducts: failed to download/store image ${imageUrl}:`, err.message);
        return null;
      }
    }

    /**
     * Process a single product row: create Firestore doc, download images.
     */
    async function processRow(row, rowIndex) {
      try {
        const now = FieldValue.serverTimestamp();

        // Create product document (images populated after download)
        const productRef = db.collection('products').doc();
        const productId = productRef.id;

        await productRef.set({
          name: row.name,
          categoryId: row.categoryId,
          price: row.price,
          currency: row.currency,
          quantity: row.quantity,
          stockQuantity: row.quantity, // ProductCard reads stockQuantity; store both for consistency
          unit: row.unit,
          description: row.description || '',
          images: [],
          userId,
          createdByAdmin: true,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        // Process image URLs if provided
        const rawImageUrls = row.imageUrls || '';
        const imageUrlList = rawImageUrls
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean);

        if (imageUrlList.length > 0) {
          const downloadedUrls = [];
          for (let i = 0; i < imageUrlList.length; i++) {
            const url = await downloadAndStoreImage(imageUrlList[i], userId, productId, i);
            if (url) downloadedUrls.push(url);
          }

          if (downloadedUrls.length > 0) {
            await productRef.update({ images: downloadedUrls, updatedAt: FieldValue.serverTimestamp() });
          }
        }

        // Add product ID to the user's productIds array so it shows on their profile
        await db.collection('users').doc(userId).update({
          productIds: FieldValue.arrayUnion(productId),
        });

        created++;
        console.log(`bulkUploadProducts: created product ${productId} (row ${rowIndex + 1})`);
      } catch (err) {
        skipped++;
        errors.push({ row: rowIndex, reason: err.message || 'Unknown error' });
        console.error(`bulkUploadProducts: failed row ${rowIndex + 1}:`, err.message);
      }
    }

    // Process rows with a concurrency limit of 3
    const CONCURRENCY = 3;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((row, j) => processRow(row, i + j)));
    }

    console.log(`bulkUploadProducts: done. created=${created}, skipped=${skipped}, errors=${errors.length}`);
    return { created, skipped, errors };
  }
);

/**
 * processScheduledAnnouncements (onSchedule)
 *
 * Runs every 5 minutes. Queries pending announcements whose scheduledFor
 * timestamp is <= now and delivers them across their selected channels.
 *
 * Matches the pattern of checkExpiredOffers / updateFairStatuses.
 */
exports.processScheduledAnnouncements = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    retryCount: 3,
  },
  async () => {
    console.log('processScheduledAnnouncements: running...');
    try {
      const now = Timestamp.now();
      const pendingSnap = await db.collection('announcements')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .get();

      if (pendingSnap.empty) {
        console.log('processScheduledAnnouncements: no pending announcements due.');
        return;
      }

      console.log(`processScheduledAnnouncements: processing ${pendingSnap.size} announcement(s).`);

      for (const doc of pendingSnap.docs) {
        // Atomically claim the announcement before delivering. This closes the
        // window where an overlapping cron run (or a retry after a timeout) sees
        // the same still-'pending' doc and delivers it a second time.
        let claimedData;
        try {
          claimedData = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            if (!fresh.exists || fresh.data().status !== 'pending') return null;
            tx.update(doc.ref, { status: 'sending', claimedAt: Timestamp.now() });
            return fresh.data();
          });
        } catch (claimErr) {
          console.error(`processScheduledAnnouncements: claim failed for ${doc.id}:`, claimErr);
          continue;
        }

        if (!claimedData) {
          console.log(`processScheduledAnnouncements: ${doc.id} already claimed, skipping.`);
          continue;
        }

        try {
          const recipientCount = await deliverAnnouncement(claimedData, doc.id);
          await doc.ref.update({
            status: 'sent',
            sentAt: Timestamp.now(),
            recipientCount,
          });
          console.log(`processScheduledAnnouncements: sent ${doc.id} to ${recipientCount} recipient(s).`);
        } catch (err) {
          await doc.ref.update({ status: 'failed' });
          console.error(`processScheduledAnnouncements: failed to deliver ${doc.id}:`, err);
        }
      }
    } catch (err) {
      console.error('processScheduledAnnouncements: unexpected error:', err);
    }
  }
);

