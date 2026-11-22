import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { WebShell } from '../layout/WebShell';
import { LogoMark } from '../ui';
import BottomTabBar from './BottomTabBar';
import { navigationRef, syncCurrentRoute } from './navRef';

import Landing from '../screens/public/Landing';
import { ForgotPassword, Login, SignUp } from '../screens/public/Auth';
import FamilyInvite from '../screens/public/FamilyInvite';
import VerifyEmail from '../screens/onboarding/VerifyEmail';
import { Onboarding, OnboardingDone } from '../screens/onboarding/Onboarding';
import Home from '../screens/home/Home';
import NotificationsScreen from '../screens/home/Notifications';
import Connections from '../screens/connections/Connections';
import PersonProfile from '../screens/connections/PersonProfile';
import GuideHome from '../screens/journey/GuideHome';
import { Journey, Stage } from '../screens/journey/Journey';
import Reflect from '../screens/journey/Reflect';
import GuideChat from '../screens/journey/GuideChat';
import Chats from '../screens/chat/Chats';
import { ChatProfile, ChatThread } from '../screens/chat/ChatThread';
import { MyProfile, MyProfileTabs } from '../screens/profile/MyProfile';
import { EditAbout, FamilyEdit, LifestyleEdit, PreferencesEdit, PreferencesReview, ProfileBuilder } from '../screens/profile/ProfileEditors';
import { Settings } from '../screens/settings/SettingsHome';
import { Info, Result, SettingOption } from '../screens/settings/Generic';
import { Account, ChangeEmail, ChangePassword, ChangePhone, Deactivate, DeleteAccount, DownloadData, EditPersonal, EmailAddress, LocationSettings, Logout, ManageAccount, PasswordSecurity, PhoneNumber } from '../screens/settings/Account';
import { BlockedUsers, PrivacyVisibility, ProfileSharing, ReportFlow, ReportSafety } from '../screens/settings/Privacy';
import { FamilyAccess, FamilyAdd, FamilyInviteForm, FamilyMember } from '../screens/settings/FamilyAccess';
import { Verification, VerificationFlow } from '../screens/settings/Verification';
import { AIPrivacy, GuideAccess, GuideConversation, GuideHistory, GuideSettings, SensitiveTopics } from '../screens/settings/GuideSettings';
import { ChatSettings, CustomChatPrefs, DiscoverySettings, NotificationSettings } from '../screens/settings/Preferences';
import { About, ContactSupport, FAQDetail, FAQs, Help, ReportProblem, SafetyResources } from '../screens/settings/Help';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(p) => <BottomTabBar {...p} />} screenOptions={{ headerShown: false }} backBehavior="history">
      <Tab.Screen name="Home" component={Home} options={{ title: 'Home' }} />
      <Tab.Screen name="Connections" component={Connections} options={{ title: 'Connections' }} />
      <Tab.Screen name="Guide" component={GuideHome} options={{ title: 'Setu Guide' }} />
      <Tab.Screen name="Chats" component={Chats} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={MyProfile} options={{ title: 'My Profile' }} />
    </Tab.Navigator>
  );
}

const linking: LinkingOptions<any> = {
  prefixes: [Linking.createURL('/'), 'https://sambandh-setu.vercel.app'],
  config: {
    screens: {
      Landing: '',
      Login: 'login',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      FamilyInvite: 'family/invite/:token',
      Info: 'info/:slug',
      VerifyEmail: 'verify-email',
      Onboarding: 'onboarding/:step?',
      OnboardingDone: 'onboarding-complete',
      Main: {
        screens: { Home: 'home', Connections: 'connections/:tab?', Guide: 'guide', Chats: 'chats', Profile: 'profile' },
      },
      Notifications: 'notifications',
      PersonProfile: 'people/:userId',
      Journey: 'journey/:connectionId',
      Stage: 'journey/:connectionId/stage/:stage',
      Reflect: 'journey/:connectionId/reflect/:mode?',
      GuideChat: 'guide/chat',
      ChatThread: 'chats/:chatId',
      ChatProfile: 'chats/:chatId/profile',
      MyProfileTabs: 'profile/view/:tab?',
      EditAbout: 'profile/edit',
      LifestyleEdit: 'profile/lifestyle/:section',
      PreferencesEdit: 'profile/preferences/:section',
      PreferencesReview: 'profile/preferences-review',
      FamilyEdit: 'profile/family',
      ProfileBuilder: 'profile/builder/:step?',
      Settings: 'settings',
      SettingOption: 'settings/option/:key',
      Result: 'done/:kind',
      Account: 'settings/account',
      EditPersonal: 'settings/account/personal',
      PhoneNumber: 'settings/account/phone',
      ChangePhone: 'settings/account/phone/change',
      EmailAddress: 'settings/account/email',
      ChangeEmail: 'settings/account/email/change',
      LocationSettings: 'settings/account/location',
      ManageAccount: 'settings/account/manage',
      DownloadData: 'settings/account/download',
      Deactivate: 'settings/account/deactivate',
      DeleteAccount: 'settings/account/delete',
      PasswordSecurity: 'settings/security',
      ChangePassword: 'settings/security/password',
      PrivacyVisibility: 'settings/privacy',
      ProfileSharing: 'settings/privacy/sharing',
      BlockedUsers: 'settings/privacy/blocked',
      ReportSafety: 'settings/privacy/report',
      ReportFlow: 'report',
      FamilyAccess: 'settings/family',
      FamilyAdd: 'settings/family/add',
      FamilyInviteForm: 'settings/family/invite/:method',
      FamilyMember: 'settings/family/:memberId',
      Verification: 'settings/verification',
      VerificationFlow: 'settings/verification/:type',
      GuideSettings: 'settings/guide',
      GuideAccess: 'settings/guide/access',
      GuideHistory: 'settings/guide/history',
      GuideConversation: 'settings/guide/history/:id',
      SensitiveTopics: 'settings/guide/sensitive-topics',
      AIPrivacy: 'settings/ai-privacy',
      NotificationSettings: 'settings/notifications',
      ChatSettings: 'settings/chat',
      CustomChatPrefs: 'settings/chat/custom',
      DiscoverySettings: 'settings/discovery',
      Help: 'settings/help',
      FAQs: 'settings/help/faqs',
      FAQDetail: 'settings/help/faqs/:index',
      ContactSupport: 'settings/help/contact',
      ReportProblem: 'settings/help/problem',
      SafetyResources: 'settings/help/safety',
      About: 'settings/about',
      Logout: 'logout',
    },
  },
};

const screen = { headerShown: false, animation: Platform.OS === 'web' ? ('none' as const) : ('default' as const) };

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 16 }}>
      <LogoMark size={56} />
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function RootNavigator() {
  const { ready, user, config } = useAuth();
  const { wide } = useLayout();
  if (!ready) return <Splash />;

  const needsEmail = !!user && config.emailCodes && !user.emailVerified;
  const needsOnboarding = !!user && !user.onboardingCompleted;
  const signedIn = !!user && !needsEmail && !needsOnboarding;

  const stack = (
    <Stack.Navigator screenOptions={screen}>
      {!user ? (
        <>
          <Stack.Screen name="Landing" component={Landing} options={{ title: 'Sambandh Setu: Find with purpose. Connect with trust.' }} />
          <Stack.Screen name="Login" component={Login} options={{ title: 'Log in · Sambandh Setu' }} />
          <Stack.Screen name="SignUp" component={SignUp} options={{ title: 'Create your account · Sambandh Setu' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ title: 'Forgot password · Sambandh Setu' }} />
        </>
      ) : needsEmail ? (
        <Stack.Screen name="VerifyEmail" component={VerifyEmail} options={{ title: 'Verify your email · Sambandh Setu' }} />
      ) : needsOnboarding ? (
        <>
          <Stack.Screen name="Onboarding" component={Onboarding} options={{ title: 'Create your profile · Sambandh Setu' }} />
          <Stack.Screen name="OnboardingDone" component={OnboardingDone} options={{ title: 'Profile completed · Sambandh Setu' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ title: 'Sambandh Setu' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
          <Stack.Screen name="PersonProfile" component={PersonProfile} options={{ title: 'Profile' }} />
          <Stack.Screen name="Journey" component={Journey} options={{ title: 'Your Journey' }} />
          <Stack.Screen name="Stage" component={Stage} options={{ title: 'Stage' }} />
          <Stack.Screen name="Reflect" component={Reflect} options={{ title: 'Reflect' }} />
          <Stack.Screen name="GuideChat" component={GuideChat} options={{ title: 'Chat with Setu Guide' }} />
          <Stack.Screen name="ChatThread" component={ChatThread} options={{ title: 'Chat' }} />
          <Stack.Screen name="ChatProfile" component={ChatProfile} options={{ title: 'Chat profile' }} />
          <Stack.Screen name="MyProfileTabs" component={MyProfileTabs} options={{ title: 'My Profile' }} />
          <Stack.Screen name="EditAbout" component={EditAbout} options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="LifestyleEdit" component={LifestyleEdit} options={{ title: 'Lifestyle' }} />
          <Stack.Screen name="PreferencesEdit" component={PreferencesEdit} options={{ title: 'Partner Preferences' }} />
          <Stack.Screen name="PreferencesReview" component={PreferencesReview} options={{ title: 'Review Preferences' }} />
          <Stack.Screen name="FamilyEdit" component={FamilyEdit} options={{ title: 'Family Background' }} />
          <Stack.Screen name="ProfileBuilder" component={ProfileBuilder} options={{ title: 'Build your profile' }} />
          <Stack.Screen name="Settings" component={Settings} options={{ title: 'Settings' }} />
          <Stack.Screen name="SettingOption" component={SettingOption} options={{ title: 'Settings' }} />
          <Stack.Screen name="Result" component={Result} options={{ title: 'Sambandh Setu' }} />
          <Stack.Screen name="Account" component={Account} options={{ title: 'Account' }} />
          <Stack.Screen name="EditPersonal" component={EditPersonal} options={{ title: 'Edit Personal Information' }} />
          <Stack.Screen name="PhoneNumber" component={PhoneNumber} options={{ title: 'Phone Number' }} />
          <Stack.Screen name="ChangePhone" component={ChangePhone} options={{ title: 'Change Phone Number' }} />
          <Stack.Screen name="EmailAddress" component={EmailAddress} options={{ title: 'Email Address' }} />
          <Stack.Screen name="ChangeEmail" component={ChangeEmail} options={{ title: 'Change Email Address' }} />
          <Stack.Screen name="LocationSettings" component={LocationSettings} options={{ title: 'Location' }} />
          <Stack.Screen name="ManageAccount" component={ManageAccount} options={{ title: 'Manage Account' }} />
          <Stack.Screen name="DownloadData" component={DownloadData} options={{ title: 'Download Your Data' }} />
          <Stack.Screen name="Deactivate" component={Deactivate} options={{ title: 'Deactivate Account' }} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccount} options={{ title: 'Delete Account' }} />
          <Stack.Screen name="PasswordSecurity" component={PasswordSecurity} options={{ title: 'Password & Security' }} />
          <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ title: 'Change Password' }} />
          <Stack.Screen name="PrivacyVisibility" component={PrivacyVisibility} options={{ title: 'Privacy & Visibility' }} />
          <Stack.Screen name="ProfileSharing" component={ProfileSharing} options={{ title: 'Profile Information Sharing' }} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsers} options={{ title: 'Blocked Users' }} />
          <Stack.Screen name="ReportSafety" component={ReportSafety} options={{ title: 'Report & Safety' }} />
          <Stack.Screen name="ReportFlow" component={ReportFlow} options={{ title: 'Report' }} />
          <Stack.Screen name="FamilyAccess" component={FamilyAccess} options={{ title: 'Family Access' }} />
          <Stack.Screen name="FamilyAdd" component={FamilyAdd} options={{ title: 'Add Family Member' }} />
          <Stack.Screen name="FamilyInviteForm" component={FamilyInviteForm} options={{ title: 'Invite Family Member' }} />
          <Stack.Screen name="FamilyMember" component={FamilyMember} options={{ title: 'Manage Access' }} />
          <Stack.Screen name="Verification" component={Verification} options={{ title: 'Verification' }} />
          <Stack.Screen name="VerificationFlow" component={VerificationFlow} options={{ title: 'Verification' }} />
          <Stack.Screen name="GuideSettings" component={GuideSettings} options={{ title: 'Setu Guide Settings' }} />
          <Stack.Screen name="GuideAccess" component={GuideAccess} options={{ title: 'What Setu Guide can access' }} />
          <Stack.Screen name="GuideHistory" component={GuideHistory} options={{ title: 'AI Conversation History' }} />
          <Stack.Screen name="GuideConversation" component={GuideConversation} options={{ title: 'Conversation' }} />
          <Stack.Screen name="SensitiveTopics" component={SensitiveTopics} options={{ title: 'Sensitive Topics' }} />
          <Stack.Screen name="AIPrivacy" component={AIPrivacy} options={{ title: 'AI & Privacy' }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: 'Notifications' }} />
          <Stack.Screen name="ChatSettings" component={ChatSettings} options={{ title: 'Chat Settings' }} />
          <Stack.Screen name="CustomChatPrefs" component={CustomChatPrefs} options={{ title: 'Custom Preferences' }} />
          <Stack.Screen name="DiscoverySettings" component={DiscoverySettings} options={{ title: 'Discovery Settings' }} />
          <Stack.Screen name="Help" component={Help} options={{ title: 'Help & Support' }} />
          <Stack.Screen name="FAQs" component={FAQs} options={{ title: 'FAQs' }} />
          <Stack.Screen name="FAQDetail" component={FAQDetail} options={{ title: 'FAQ' }} />
          <Stack.Screen name="ContactSupport" component={ContactSupport} options={{ title: 'Contact Support' }} />
          <Stack.Screen name="ReportProblem" component={ReportProblem} options={{ title: 'Report a Problem' }} />
          <Stack.Screen name="SafetyResources" component={SafetyResources} options={{ title: 'Safety Resources' }} />
          <Stack.Screen name="About" component={About} options={{ title: 'About Sambandh Setu' }} />
          <Stack.Screen name="Logout" component={Logout} options={{ title: 'Log Out' }} />
        </>
      )}
      <Stack.Screen name="FamilyInvite" component={FamilyInvite} options={{ title: 'Family Access Invitation · Sambandh Setu' }} />
      <Stack.Screen name="Info" component={Info} options={{ title: 'Sambandh Setu' }} />
    </Stack.Navigator>
  );

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={syncCurrentRoute}
      onStateChange={() => {
        syncCurrentRoute();
        if (Platform.OS === 'web') (globalThis as any).document?.activeElement?.blur?.();
      }}
      documentTitle={{ formatter: (options, route) => options?.title || route?.name || 'Sambandh Setu' }}
      fallback={<Splash />}
    >
      {signedIn && wide ? <WebShell>{stack}</WebShell> : stack}
    </NavigationContainer>
  );
}
