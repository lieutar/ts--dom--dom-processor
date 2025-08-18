import { describe, test } from 'vitest';
import { asDocument } from 'domlib';
import { JSDOM } from 'jsdom';
import { DOMProcessor } from '@src/DOMProcessor';

const window = new JSDOM().window;

describe('DOMProcessor', ()=>{
  test('', ()=>{
    const doc = asDocument(window, ['foo-document']);
    const dp  = new DOMProcessor();
  });
});
