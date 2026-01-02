/**
 * Registration API Route
 * 
 * POST /api/auth/register - Register a new user
 * 
 * Requirements: 1.1, 1.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/services/auth.service';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { validateEmail, validatePassword } from '@/lib/validation';

interface RegisterBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: RegisterBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    // Validate required fields
    const errors: string[] = [];

    if (!body.email) {
      errors.push('email is required');
    }
    if (!body.password) {
      errors.push('password is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(validationErrorResponse(errors), { status: 400 });
    }

    // Validate email format
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        validationErrorResponse(emailValidation.errors),
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        validationErrorResponse(passwordValidation.errors),
        { status: 400 }
      );
    }

    // Register user
    const result = await register(body.email, body.password);

    if (!result.success) {
      // Check if it's a duplicate email error
      if (result.error === 'Email already registered') {
        return NextResponse.json(
          errorResponse(result.error, 409),
          { status: 409 }
        );
      }
      return NextResponse.json(
        validationErrorResponse([result.error || 'Registration failed']),
        { status: 400 }
      );
    }

    // Return success with user data (excluding sensitive info)
    return NextResponse.json(
      successResponse(
        {
          id: result.user!.id.toString(),
          email: result.user!.email,
          created_at: result.user!.created_at,
        },
        'User registered successfully',
        201
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
