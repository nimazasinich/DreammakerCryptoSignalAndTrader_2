/**
 * HuggingFace Token Validation Helper
 * 
 * Validates HF token format and checks authentication with HF API
 */

import { Logger } from '../core/Logger.js';

export interface TokenValidationResult {
    ok: boolean;
    reason?: string;
    status?: number;
    error?: string;
}

/**
 * Validates HF token format (basic check)
 */
export function isValidTokenFormat(token: string | undefined): boolean {
    if (!token) return false;
    // HF tokens typically start with 'hf_' and are ~37 characters
    // Example: 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
    return token.startsWith('hf_') && token.length >= 30;
}

/**
 * Verify HF token with Hugging Face API
 * Calls the whoami-v2 endpoint to validate token
 */
export async function verifyHFToken(
    token: string | undefined,
    baseUrl: string = 'https://huggingface.co'
): Promise<TokenValidationResult> {
    if (!token) {
        return { ok: false, reason: 'no_token' };
    }

    if (!isValidTokenFormat(token)) {
        return { ok: false, reason: 'invalid_format' };
    }

    try {
        const response = await fetch(`${baseUrl}/api/whoami-v2`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            return { ok: true };
        }

        if (response.status === 403 || response.status === 401) {
            return { 
                ok: false, 
                reason: 'unauthorized', 
                status: response.status 
            };
        }

        return { 
            ok: false, 
            reason: 'unknown', 
            status: response.status 
        };
    } catch (error: any) {
        return { 
            ok: false, 
            reason: 'network_error', 
            error: String(error?.message || error) 
        };
    }
}

/**
 * Log token validation results with actionable guidance
 */
export function logTokenValidation(
    result: TokenValidationResult,
    hasToken: boolean,
    logger: Logger
): void {
    if (result.ok) {
        logger.info('✅ HF token validated successfully');
        return;
    }

    switch (result.reason) {
        case 'no_token':
            logger.warn('⚠️ No HF_TOKEN detected');
            logger.warn('   WebSocket may be rate-limited or denied');
            logger.warn('   ACTION: Set HF_TOKEN in .env file');
            logger.warn('   Get token from: https://huggingface.co/settings/tokens (with "write" scope)');
            break;

        case 'invalid_format':
            logger.error('❌ HF_TOKEN has invalid format');
            logger.error('   Expected format: hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
            logger.error('   ACTION: Verify HF_TOKEN in .env file');
            logger.error('   Get token from: https://huggingface.co/settings/tokens');
            break;

        case 'unauthorized':
            logger.error(`❌ HF_TOKEN unauthorized (HTTP ${result.status})`);
            logger.error('   Token is invalid, expired, or lacks required permissions');
            logger.error('   ACTION: Generate new token at https://huggingface.co/settings/tokens');
            logger.error('   Ensure token has "write" role and update HF_TOKEN in .env');
            break;

        case 'network_error':
            logger.warn(`⚠️ Could not verify HF_TOKEN: ${result.error}`);
            logger.warn('   Network connectivity issue or HF API temporarily unavailable');
            logger.warn('   Will attempt WebSocket connection anyway');
            break;

        default:
            logger.warn(`⚠️ HF_TOKEN validation returned unexpected status: ${result.status}`);
            logger.warn('   Will attempt WebSocket connection anyway');
            break;
    }
}

