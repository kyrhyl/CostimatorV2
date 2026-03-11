/**
 * API Test Helper Utilities
 * Provides functions to test Next.js route handlers directly without HTTP requests
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a mock NextRequest object for testing route handlers
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit as any);
}

/**
 * Calls a route handler and extracts the response data
 */
export async function callRouteHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse,
  request: NextRequest,
  context?: any
): Promise<{
  status: number;
  data: any;
  headers: Headers;
}> {
  const response = await handler(request, context);
  
  let data: any;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

/**
 * Helper to test GET requests
 * Auto-extracts [id] from paths like /api/master/materials/123
 */
export async function testGET(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  path: string,
  queryParams?: Record<string, string>,
  params?: Record<string, string>
) {
  const baseUrl = 'http://localhost:3000';
  const url = new URL(path, baseUrl);
  
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Auto-extract ID from path if handler expects params but none provided
  if (!params) {
    const pathParts = path.split('/').filter(p => p);
    const lastPart = pathParts[pathParts.length - 1];
    // Check if last part looks like an ID (not a known route segment)
    if (lastPart && !['materials', 'labor', 'equipment', 'prices', 'api', 'master'].includes(lastPart)) {
      params = { id: lastPart };
    }
  }

  const request = createMockRequest(url.toString(), { method: 'GET' });
  const context = params ? { params } : undefined;
  return callRouteHandler(handler, request, context);
}

/**
 * Helper to test POST requests
 */
export async function testPOST(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  path: string,
  body: any,
  params?: Record<string, string>
) {
  const url = `http://localhost:3000${path}`;
  const request = createMockRequest(url, { method: 'POST', body });
  const context = params ? { params } : undefined;
  return callRouteHandler(handler, request, context);
}

/**
 * Helper to test PATCH requests
 * Auto-extracts [id] from paths like /api/master/materials/123
 */
export async function testPATCH(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  path: string,
  body: any,
  params?: Record<string, string>
) {
  const url = `http://localhost:3000${path}`;
  const request = createMockRequest(url, { method: 'PATCH', body });
  
  // Auto-extract ID from path if handler expects params but none provided
  if (!params) {
    const pathParts = path.split('/').filter(p => p);
    const lastPart = pathParts[pathParts.length - 1];
    // Check if last part looks like an ID (not a known route segment)
    if (lastPart && !['materials', 'labor', 'equipment', 'prices', 'api', 'master'].includes(lastPart)) {
      params = { id: lastPart };
    }
  }
  
  const context = params ? { params } : undefined;
  return callRouteHandler(handler, request, context);
}

/**
 * Helper to test DELETE requests
 * Auto-extracts [id] from paths like /api/master/materials/123
 */
export async function testDELETE(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  path: string,
  params?: Record<string, string>
) {
  const url = `http://localhost:3000${path}`;
  const request = createMockRequest(url, { method: 'DELETE' });
  
  // Auto-extract ID from path if handler expects params but none provided
  if (!params) {
    const pathParts = path.split('/').filter(p => p);
    const lastPart = pathParts[pathParts.length - 1];
    // Check if last part looks like an ID (not a known route segment)
    if (lastPart && !['materials', 'labor', 'equipment', 'prices', 'api', 'master'].includes(lastPart)) {
      params = { id: lastPart };
    }
  }
  
  const context = params ? { params } : undefined;
  return callRouteHandler(handler, request, context);
}
