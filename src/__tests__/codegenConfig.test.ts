// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require('../../package.json') as {
  codegenConfig?: { ios?: { componentProvider?: Record<string, string> } };
};

describe('codegenConfig', () => {
  it('does not register Android-only RTNSecureWindowAnchor on iOS', () => {
    const providers = packageJson.codegenConfig?.ios?.componentProvider ?? {};

    expect(providers).toEqual({
      SecureView: 'RTNSecureView',
    });
    expect(providers).not.toHaveProperty('RTNSecureWindowAnchor');
  });
});
