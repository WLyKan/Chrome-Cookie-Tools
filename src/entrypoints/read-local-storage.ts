export default defineUnlistedScript({
  // Set include/exclude if the script should be removed from some builds
  // include: undefined | string[],
  // exclude: undefined | string[],
  main() {
    // Executed when script is loaded
    console.log('>> unlisted Content script loaded.');
  },
});
