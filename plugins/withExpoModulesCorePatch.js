const fs = require('fs');
const path = require('path');

module.exports = function withExpoModulesCorePatch(config) {
  // Resolve the path to expo-modules-core's Gradle plugin script
  const filePath = path.resolve(__dirname, '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle');
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('from components.release')) {
      content = content.replace(
        'from components.release',
        'def releaseComponent = components.findByName("release")\n          if (releaseComponent != null) {\n            from releaseComponent\n          }'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully patched ExpoModulesCorePlugin.gradle.');
    } else {
      console.log('ExpoModulesCorePlugin.gradle is already patched or does not contain components.release.');
    }
  } else {
    console.warn('ExpoModulesCorePlugin.gradle not found at: ' + filePath);
  }
  return config;
};
