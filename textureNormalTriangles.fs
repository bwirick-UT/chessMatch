precision mediump float;
varying vec4 fragPosition;
varying vec2 fragUV;
varying vec3 fragNormal;

uniform sampler2D uTexture;
uniform vec3 uEyePosition;
uniform vec3 uLightDirection;
uniform vec3 uCameraLightDirection; // Second light that follows the camera

void main() {
    vec4 materialColor = texture2D(uTexture, fragUV);
    vec4 finalColor = vec4(0,0,0,1);

    // Add ambient (increased for better visibility from all angles):
    float ambient = 0.3;
    finalColor += materialColor * ambient;

    vec3 normalizedNormalVector = normalize(fragNormal);
    vec3 toEye = normalize(uEyePosition - fragPosition.xyz);
    float shininess = 80.0;
    vec4 specularColor = vec4(1.0,1.0,1.0,0.0);

    // Process main light (directional)
    vec3 lightDirection = normalize(uLightDirection);
    vec3 toLight = -lightDirection;
    float diffuse1 = max(dot(normalizedNormalVector, toLight), 0.0) * 0.5;

    if(diffuse1 > 0.0) {
      finalColor += materialColor * diffuse1;

      // Add specular for main light
      vec3 lightDirectionReflected = reflect(lightDirection, normalizedNormalVector);
      float specular1 = pow(max(dot(toEye, lightDirectionReflected), 0.0), shininess);
      finalColor += specularColor * specular1 * 0.5;
    }

    // Process camera light (follows the player's view)
    vec3 cameraLightDir = normalize(uCameraLightDirection);
    vec3 toCameraLight = -cameraLightDir;
    float diffuse2 = max(dot(normalizedNormalVector, toCameraLight), 0.0) * 0.4;

    if(diffuse2 > 0.0) {
      finalColor += materialColor * diffuse2;

      // Add specular for camera light
      vec3 cameraLightReflected = reflect(cameraLightDir, normalizedNormalVector);
      float specular2 = pow(max(dot(toEye, cameraLightReflected), 0.0), shininess);
      finalColor += specularColor * specular2 * 0.3;
    }

    if(finalColor[0] > 1.0)
        finalColor[0] = 1.0;
    if(finalColor[1] > 1.0)
        finalColor[1] = 1.0;
    if(finalColor[2] > 1.0)
        finalColor[2] = 1.0;

    gl_FragColor = finalColor;
}
