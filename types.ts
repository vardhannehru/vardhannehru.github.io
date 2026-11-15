
// Global type definitions for the application.

declare global {
  type Page = 'home' | 'work' | 'about' | 'contact';

  interface ContactInfo {
    email: string;
    linkedin: string;
    customLink?: string;
  }
}

// `export {}` ensures this file is treated as a module, which is required
// for `declare global` to perform module augmentation correctly.
export {};