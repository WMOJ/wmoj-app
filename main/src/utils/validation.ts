const USERNAME_REGEX = /^[a-zA-Z0-9_.\-]{1,30}$/;
const SLUG_REGEX = /^[a-zA-Z0-9_\-]{1,60}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';

  if (/\s/.test(username)){
     return 'Username cannot contain spaces';
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'Username must be 1-30 characters: letters, numbers, underscores, hyphens, or dots only';
  }
  return null;
}

export function validateSlug(slug: string, entityName: string): string | null {
  if (!slug) return `${entityName} ID is required`;

  if (/\s/.test(slug)) return `${entityName} ID cannot contain spaces`;
  
  if (!SLUG_REGEX.test(slug))
    return `${entityName} ID must be 1-60 characters: letters, numbers, hyphens, or underscores only`;
  return null;
}
