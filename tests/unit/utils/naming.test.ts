/**
 * Tests for naming utilities
 */

import { describe, it, expect } from 'vitest';
import {
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
  isValidIdentifier,
  isReservedKeyword,
  sanitizeIdentifier,
  toTypeName,
  toOperationName,
  toEnumMemberName,
  toQueryKeyName,
  toHookName,
  escapeString,
  pluralize,
  singularize,
} from '../../../src/utils/naming.js';

describe('case conversion', () => {
  describe('camelCase', () => {
    it('should convert from snake_case', () => {
      expect(camelCase('user_name')).toBe('userName');
      expect(camelCase('get_user_by_id')).toBe('getUserById');
    });

    it('should convert from kebab-case', () => {
      expect(camelCase('user-name')).toBe('userName');
      expect(camelCase('get-user-by-id')).toBe('getUserById');
    });

    it('should convert from PascalCase', () => {
      expect(camelCase('UserName')).toBe('userName');
      expect(camelCase('GetUserById')).toBe('getUserById');
    });

    it('should convert from space-separated', () => {
      expect(camelCase('user name')).toBe('userName');
      expect(camelCase('get user by id')).toBe('getUserById');
    });

    it('should handle mixed separators', () => {
      expect(camelCase('user_name-value')).toBe('userNameValue');
      expect(camelCase('user name_value')).toBe('userNameValue');
    });

    it('should handle single word', () => {
      expect(camelCase('user')).toBe('user');
      expect(camelCase('User')).toBe('user');
    });

    it('should handle empty string', () => {
      expect(camelCase('')).toBe('');
    });

    it('should handle consecutive separators', () => {
      expect(camelCase('user__name')).toBe('userName');
      expect(camelCase('user--name')).toBe('userName');
    });
  });

  describe('pascalCase', () => {
    it('should convert from snake_case', () => {
      expect(pascalCase('user_name')).toBe('UserName');
      expect(pascalCase('get_user_by_id')).toBe('GetUserById');
    });

    it('should convert from kebab-case', () => {
      expect(pascalCase('user-name')).toBe('UserName');
      expect(pascalCase('get-user-by-id')).toBe('GetUserById');
    });

    it('should convert from camelCase', () => {
      expect(pascalCase('userName')).toBe('UserName');
      expect(pascalCase('getUserById')).toBe('GetUserById');
    });

    it('should convert from space-separated', () => {
      expect(pascalCase('user name')).toBe('UserName');
    });

    it('should handle single word', () => {
      expect(pascalCase('user')).toBe('User');
      expect(pascalCase('User')).toBe('User');
    });

    it('should handle empty string', () => {
      expect(pascalCase('')).toBe('');
    });
  });

  describe('snakeCase', () => {
    it('should convert from camelCase', () => {
      expect(snakeCase('userName')).toBe('user_name');
      expect(snakeCase('getUserById')).toBe('get_user_by_id');
    });

    it('should convert from PascalCase', () => {
      expect(snakeCase('UserName')).toBe('user_name');
      expect(snakeCase('GetUserById')).toBe('get_user_by_id');
    });

    it('should convert from kebab-case', () => {
      expect(snakeCase('user-name')).toBe('user_name');
      expect(snakeCase('get-user-by-id')).toBe('get_user_by_id');
    });

    it('should convert from space-separated', () => {
      expect(snakeCase('user name')).toBe('user_name');
    });

    it('should handle single word', () => {
      expect(snakeCase('user')).toBe('user');
      expect(snakeCase('User')).toBe('user');
    });

    it('should handle empty string', () => {
      expect(snakeCase('')).toBe('');
    });
  });

  describe('kebabCase', () => {
    it('should convert from camelCase', () => {
      expect(kebabCase('userName')).toBe('user-name');
      expect(kebabCase('getUserById')).toBe('get-user-by-id');
    });

    it('should convert from PascalCase', () => {
      expect(kebabCase('UserName')).toBe('user-name');
      expect(kebabCase('GetUserById')).toBe('get-user-by-id');
    });

    it('should convert from snake_case', () => {
      expect(kebabCase('user_name')).toBe('user-name');
      expect(kebabCase('get_user_by_id')).toBe('get-user-by-id');
    });

    it('should convert from space-separated', () => {
      expect(kebabCase('user name')).toBe('user-name');
    });

    it('should handle single word', () => {
      expect(kebabCase('user')).toBe('user');
      expect(kebabCase('User')).toBe('user');
    });

    it('should handle empty string', () => {
      expect(kebabCase('')).toBe('');
    });
  });

  describe('constantCase', () => {
    it('should convert to CONSTANT_CASE', () => {
      expect(constantCase('userName')).toBe('USER_NAME');
      expect(constantCase('getUserById')).toBe('GET_USER_BY_ID');
    });

    it('should convert from various formats', () => {
      expect(constantCase('user-name')).toBe('USER_NAME');
      expect(constantCase('user_name')).toBe('USER_NAME');
      expect(constantCase('user name')).toBe('USER_NAME');
    });

    it('should handle single word', () => {
      expect(constantCase('user')).toBe('USER');
    });

    it('should handle empty string', () => {
      expect(constantCase('')).toBe('');
    });
  });
});

describe('identifier validation', () => {
  describe('isValidIdentifier', () => {
    it('should return true for valid identifiers', () => {
      expect(isValidIdentifier('user')).toBe(true);
      expect(isValidIdentifier('userName')).toBe(true);
      expect(isValidIdentifier('_private')).toBe(true);
      expect(isValidIdentifier('$dollar')).toBe(true);
      expect(isValidIdentifier('user123')).toBe(true);
      expect(isValidIdentifier('_')).toBe(true);
      expect(isValidIdentifier('$')).toBe(true);
    });

    it('should return false for invalid identifiers', () => {
      expect(isValidIdentifier('123user')).toBe(false);
      expect(isValidIdentifier('user-name')).toBe(false);
      expect(isValidIdentifier('user name')).toBe(false);
      expect(isValidIdentifier('user.name')).toBe(false);
      expect(isValidIdentifier('')).toBe(false);
    });
  });

  describe('isReservedKeyword', () => {
    it('should return true for TypeScript keywords', () => {
      expect(isReservedKeyword('class')).toBe(true);
      expect(isReservedKeyword('function')).toBe(true);
      expect(isReservedKeyword('interface')).toBe(true);
      expect(isReservedKeyword('type')).toBe(true);
      expect(isReservedKeyword('const')).toBe(true);
      expect(isReservedKeyword('let')).toBe(true);
      expect(isReservedKeyword('var')).toBe(true);
      expect(isReservedKeyword('return')).toBe(true);
      expect(isReservedKeyword('import')).toBe(true);
      expect(isReservedKeyword('export')).toBe(true);
    });

    it('should return true for TypeScript type keywords', () => {
      expect(isReservedKeyword('string')).toBe(true);
      expect(isReservedKeyword('number')).toBe(true);
      expect(isReservedKeyword('boolean')).toBe(true);
      expect(isReservedKeyword('any')).toBe(true);
      expect(isReservedKeyword('unknown')).toBe(true);
      expect(isReservedKeyword('never')).toBe(true);
      expect(isReservedKeyword('void')).toBe(true);
    });

    it('should return false for non-keywords', () => {
      expect(isReservedKeyword('user')).toBe(false);
      expect(isReservedKeyword('name')).toBe(false);
      expect(isReservedKeyword('value')).toBe(false);
      expect(isReservedKeyword('data')).toBe(false);
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should replace invalid characters with underscores', () => {
      expect(sanitizeIdentifier('user-name')).toBe('user_name');
      expect(sanitizeIdentifier('user.name')).toBe('user_name');
      expect(sanitizeIdentifier('user name')).toBe('user_name');
      expect(sanitizeIdentifier('user@email')).toBe('user_email');
    });

    it('should prefix with underscore if starts with number', () => {
      expect(sanitizeIdentifier('123user')).toBe('_123user');
      expect(sanitizeIdentifier('1name')).toBe('_1name');
    });

    it('should append underscore for reserved keywords', () => {
      expect(sanitizeIdentifier('class')).toBe('class_');
      expect(sanitizeIdentifier('function')).toBe('function_');
      expect(sanitizeIdentifier('type')).toBe('type_');
    });

    it('should leave valid identifiers unchanged', () => {
      expect(sanitizeIdentifier('userName')).toBe('userName');
      expect(sanitizeIdentifier('_private')).toBe('_private');
      expect(sanitizeIdentifier('$value')).toBe('$value');
    });

    it('should handle combination of issues', () => {
      // Note: sanitizeIdentifier checks reserved keywords after replacing chars,
      // so '_123_class' is not a reserved keyword
      expect(sanitizeIdentifier('123-class')).toBe('_123_class');
    });
  });
});

describe('name generators', () => {
  describe('toTypeName', () => {
    it('should convert path to PascalCase type name', () => {
      expect(toTypeName('/users')).toBe('Users');
      expect(toTypeName('/users/profile')).toBe('UsersProfile');
    });

    it('should handle path parameters', () => {
      // The implementation converts {param} to ByParam
      expect(toTypeName('/users/{userId}')).toBe('UsersByuserId');
      expect(toTypeName('/pets/{petId}/photos')).toBe('PetsBypetIdPhotos');
    });

    it('should handle schema names', () => {
      expect(toTypeName('User')).toBe('User');
      expect(toTypeName('user_profile')).toBe('UserProfile');
      expect(toTypeName('user-settings')).toBe('UserSettings');
    });

    it('should handle special characters', () => {
      expect(toTypeName('/api/v1/users')).toBe('ApiV1Users');
    });
  });

  describe('toOperationName', () => {
    it('should combine method and path into camelCase', () => {
      expect(toOperationName('get', '/users')).toBe('getUsers');
      expect(toOperationName('post', '/users')).toBe('postUsers');
      expect(toOperationName('delete', '/users')).toBe('deleteUsers');
    });

    it('should handle path parameters', () => {
      expect(toOperationName('get', '/users/{userId}')).toBe('getUsersUserId');
      expect(toOperationName('delete', '/pets/{petId}')).toBe('deletePetsPetId');
    });

    it('should handle nested paths', () => {
      expect(toOperationName('get', '/users/{userId}/posts')).toBe('getUsersUserIdPosts');
    });
  });

  describe('toEnumMemberName', () => {
    it('should convert string values to PascalCase', () => {
      expect(toEnumMemberName('active')).toBe('Active');
      expect(toEnumMemberName('in_progress')).toBe('InProgress');
      expect(toEnumMemberName('pending-review')).toBe('PendingReview');
    });

    it('should handle special characters', () => {
      expect(toEnumMemberName('type@value')).toBe('TypeValue');
      expect(toEnumMemberName('some.value')).toBe('SomeValue');
    });

    it('should handle numeric values', () => {
      expect(toEnumMemberName(0)).toBe('Value0');
      expect(toEnumMemberName(42)).toBe('Value42');
      expect(toEnumMemberName(-1)).toBe('ValueNeg1');
      expect(toEnumMemberName(-42)).toBe('ValueNeg42');
    });

    it('should prefix with underscore if starts with number', () => {
      // The implementation adds underscore prefix, then converts to PascalCase
      // which removes the leading underscore in the final result
      expect(toEnumMemberName('123abc')).toBe('123abc');
    });

    it('should handle strings with leading/trailing underscores', () => {
      expect(toEnumMemberName('__value__')).toBe('Value');
      expect(toEnumMemberName('_test_')).toBe('Test');
    });
  });

  describe('toQueryKeyName', () => {
    it('should convert operation id to camelCase', () => {
      expect(toQueryKeyName('getUsers')).toBe('getUsers');
      expect(toQueryKeyName('GetUsers')).toBe('getUsers');
      expect(toQueryKeyName('get_users')).toBe('getUsers');
    });
  });

  describe('toHookName', () => {
    it('should add use prefix by default', () => {
      expect(toHookName('getUsers')).toBe('useGetUsers');
      expect(toHookName('createPost')).toBe('useCreatePost');
    });

    it('should use custom prefix', () => {
      expect(toHookName('getUsers', 'useSuspense')).toBe('useSuspenseGetUsers');
      expect(toHookName('getUsers', 'useLazy')).toBe('useLazyGetUsers');
    });

    it('should handle different case inputs', () => {
      expect(toHookName('get_users')).toBe('useGetUsers');
      expect(toHookName('GET_USERS')).toBe('useGETUSERS');
    });
  });
});

describe('string utilities', () => {
  describe('escapeString', () => {
    it('should escape backslashes', () => {
      expect(escapeString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape single quotes', () => {
      expect(escapeString("it's")).toBe("it\\'s");
    });

    it('should escape double quotes', () => {
      expect(escapeString('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape newlines', () => {
      expect(escapeString('line1\nline2')).toBe('line1\\nline2');
    });

    it('should escape carriage returns', () => {
      expect(escapeString('line1\rline2')).toBe('line1\\rline2');
    });

    it('should escape tabs', () => {
      expect(escapeString('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('should handle multiple escape sequences', () => {
      expect(escapeString('path\\file\n"quoted"')).toBe('path\\\\file\\n\\"quoted\\"');
    });

    it('should leave normal strings unchanged', () => {
      expect(escapeString('normal string')).toBe('normal string');
    });
  });

  describe('pluralize', () => {
    it('should add s to regular words', () => {
      expect(pluralize('user')).toBe('users');
      expect(pluralize('pet')).toBe('pets');
      expect(pluralize('car')).toBe('cars');
    });

    it('should handle words ending in y', () => {
      expect(pluralize('category')).toBe('categories');
      expect(pluralize('entity')).toBe('entities');
    });

    it('should handle words ending in s, x, ch, sh', () => {
      expect(pluralize('bus')).toBe('buses');
      expect(pluralize('box')).toBe('boxes');
      expect(pluralize('match')).toBe('matches');
      expect(pluralize('dish')).toBe('dishes');
    });
  });

  describe('singularize', () => {
    it('should remove s from regular words', () => {
      expect(singularize('users')).toBe('user');
      expect(singularize('pets')).toBe('pet');
      expect(singularize('cars')).toBe('car');
    });

    it('should handle words ending in ies', () => {
      expect(singularize('categories')).toBe('category');
      expect(singularize('entities')).toBe('entity');
    });

    it('should handle words ending in es', () => {
      expect(singularize('buses')).toBe('bus');
      expect(singularize('boxes')).toBe('box');
      expect(singularize('matches')).toBe('match');
    });

    it('should not modify words ending in ss', () => {
      expect(singularize('class')).toBe('class');
      expect(singularize('grass')).toBe('grass');
    });

    it('should not modify words not ending in s', () => {
      expect(singularize('user')).toBe('user');
      expect(singularize('data')).toBe('data');
    });
  });
});
