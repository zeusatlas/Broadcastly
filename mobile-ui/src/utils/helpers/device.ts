import * as Device from 'expo-device';
import { Platform } from 'react-native';

const APP = 'Broadcastly';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Android's device name is the marketing name ("Galaxy A12") unless the owner renamed it; a renamed
// phone often carries a person's name ("Kofi's phone"), which must not reach the server or its logs.
function androidName() {
  const named = Device.deviceName?.trim();
  if (named && !/['’]s/i.test(named)) return named;
  const maker = capitalise((Device.manufacturer ?? Device.brand ?? '').trim());
  const model = (Device.modelName ?? '').trim();
  if (!model) return maker || 'Android phone';
  return model.toLowerCase().startsWith(maker.toLowerCase()) ? model : `${maker} ${model}`.trim();
}

// Sent as the User-Agent so the server stores a readable device per session, e.g.
// "Broadcastly (Android 14; Galaxy A12)" or "Broadcastly (iOS 18.2; iPhone 13)". No IDs are sent.
export function clientUserAgent() {
  if (Platform.OS === 'android') {
    return `${APP} (Android ${Device.osVersion ?? Platform.Version}; ${androidName()})`;
  }
  if (Platform.OS === 'ios') {
    const model =
      Device.modelName ?? (Device.deviceType === Device.DeviceType.TABLET ? 'iPad' : 'iPhone');
    return `${APP} (${Device.osName ?? 'iOS'} ${Device.osVersion ?? Platform.Version}; ${model})`;
  }
  return `${APP} (${Platform.OS})`;
}

export interface DeviceDescription {
  name: string;
  detail: string | null;
  kind: 'phone' | 'web' | 'other';
}

// Reads what clientUserAgent() sent; older sessions only have the platform's default agent.
export function describeUserAgent(userAgent: string | null): DeviceDescription {
  const agent = userAgent ?? '';
  const ours = agent.match(/^Broadcastly \(([^;]+);\s*([^)]+)\)/);
  if (ours) return { name: ours[2]!.trim(), detail: ours[1]!.trim(), kind: 'phone' };
  if (/ExpoGo|okhttp|android/i.test(agent)) {
    return {
      name: 'Android phone',
      detail: 'Sign in again on it to show the model',
      kind: 'phone',
    };
  }
  if (/iphone/i.test(agent)) return { name: 'iPhone', detail: null, kind: 'phone' };
  if (/ipad/i.test(agent)) return { name: 'iPad', detail: null, kind: 'phone' };
  if (/CFNetwork|darwin/i.test(agent)) {
    return { name: 'Apple device', detail: 'Sign in again on it to show the model', kind: 'phone' };
  }
  if (/mozilla|chrome|safari|firefox|edg/i.test(agent)) {
    return { name: 'Web browser', detail: null, kind: 'web' };
  }
  return { name: 'Other device', detail: null, kind: 'other' };
}
