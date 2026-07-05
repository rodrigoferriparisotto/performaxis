// Disable all console methods in production
export const disableConsole = () => {
  if (import.meta.env.PROD || import.meta.env.VITE_DISABLE_CONSOLE === 'true') {
    const noop = () => {};

    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
  }
};
