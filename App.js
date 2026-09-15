import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('home');

  function openScreen(name) {
    setScreen(name);
  }

  function goHome() {
    setScreen('home');
  }

  if (screen === 'call') {
    return <VideoCallScreen onBack={goHome} />;
  }

  if (screen === 'video') {
    return <ComingSoonScreen
      title="Generate Video"
      subtitle="Turn your image into an AI-powered video."
      icon="✨"
      onBack={goHome}
    />;
  }

  if (screen === 'image') {
    return <ComingSoonScreen
      title="Create Image"
      subtitle="Create new images with AI."
      icon="🎨"
      onBack={goHome}
    />;
  }

  if (screen === 'gallery') {
    return <ComingSoonScreen
      title="My Gallery"
      subtitle="Your generated videos and images will appear here."
      icon="🖼"
      onBack={goHome}
    />;
  }

  if (screen === 'profile') {
    return <ComingSoonScreen
      title="Profile"
      subtitle="Account and Kelvin Live settings."
      icon="👤"
      onBack={goHome}
    />;
  }

  return (
    <HomeScreen
      onOpen={openScreen}
    />
  );
}

function HomeScreen({ onOpen }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.container}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* HEADER */}
          <View style={styles.header}>

            <View style={styles.brandRow}>

              <View style={styles.smallLogo}>
                <Text style={styles.smallLogoText}>
                  K
                </Text>
              </View>

              <Text style={styles.brandName}>
                Kelvin Live
              </Text>

            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={() => {}}
            >
              <Text style={styles.notificationIcon}>
                ♧
              </Text>
            </Pressable>

          </View>

          {/* GREETING */}
          <View style={styles.greetingCard}>

            <View style={styles.greetingTextArea}>

              <Text style={styles.greeting}>
                Hello 👋
              </Text>

              <Text style={styles.greetingTitle}>
                Ready to create something?
              </Text>

              <Text style={styles.greetingSubtitle}>
                Call, create and bring your ideas to life.
              </Text>

            </View>

            <View style={styles.greetingLogo}>
              <Text style={styles.greetingLogoText}>
                K
              </Text>
            </View>

          </View>

          {/* MAIN FEATURES */}
          <Text style={styles.sectionTitle}>
            Create & Connect
          </Text>

          <View style={styles.grid}>

            <FeatureCard
              icon="📹"
              title="Video Call"
              subtitle="Connect with another phone"
              onPress={() => onOpen('call')}
              large
            />

            <FeatureCard
              icon="✨"
              title="AI Video"
              subtitle="Turn images into videos"
              onPress={() => onOpen('video')}
              large
            />

            <FeatureCard
              icon="🎨"
              title="Create Image"
              subtitle="Create with AI"
              onPress={() => onOpen('image')}
            />

            <FeatureCard
              icon="🖼"
              title="My Gallery"
              subtitle="Your creations"
              onPress={() => onOpen('gallery')}
            />

          </View>

          {/* AI FEATURE BANNER */}
          <Pressable
            style={styles.aiBanner}
            onPress={() => onOpen('video')}
          >

            <View style={styles.aiBannerIcon}>
              <Text style={styles.aiBannerIconText}>
                ✨
              </Text>
            </View>

            <View style={styles.aiBannerText}>

              <Text style={styles.aiBannerTitle}>
                Bring your images to life
              </Text>

              <Text style={styles.aiBannerSubtitle}>
                Create talking, moving videos from your images.
              </Text>

            </View>

            <Text style={styles.aiBannerArrow}>
              →
            </Text>

          </Pressable>

          {/* RECENT */}
          <View style={styles.sectionHeader}>

            <Text style={styles.sectionTitle}>
              Recent
            </Text>

            <Pressable
              onPress={() => onOpen('gallery')}
            >
              <Text style={styles.viewAll}>
                View all →
              </Text>
            </Pressable>

          </View>

          <View style={styles.emptyRecent}>

            <Text style={styles.emptyIcon}>
              ✨
            </Text>

            <Text style={styles.emptyTitle}>
              Your creations will appear here
            </Text>

            <Text style={styles.emptySubtitle}>
              Start by creating an image or video.
            </Text>

          </View>

        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <View style={styles.bottomNav}>

          <NavItem
            icon="⌂"
            label="Home"
            active
            onPress={() => onOpen('home')}
          />

          <NavItem
            icon="+"
            label="Create"
            onPress={() => onOpen('image')}
          />

          <NavItem
            icon="▣"
            label="Gallery"
            onPress={() => onOpen('gallery')}
          />

          <NavItem
            icon="●"
            label="Profile"
            onPress={() => onOpen('profile')}
          />

        </View>

      </View>
    </SafeAreaView>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
  onPress,
  large,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        large && styles.largeFeatureCard,
        pressed && styles.featurePressed,
      ]}
    >

      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>
          {icon}
        </Text>
      </View>

      <Text style={styles.featureTitle}>
        {title}
      </Text>

      <Text style={styles.featureSubtitle}>
        {subtitle}
      </Text>

      <Text style={styles.featureArrow}>
        →
      </Text>

    </Pressable>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.navItem}
    >

      <Text
        style={[
          styles.navIcon,
          active && styles.navActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.navLabel,
          active && styles.navActive,
        ]}
      >
        {label}
      </Text>

    </Pressable>
  );
}

function VideoCallScreen({ onBack }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.callContainer}>

        <View style={styles.pageHeader}>

          <Pressable
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ←
            </Text>
          </Pressable>

          <View>
            <Text style={styles.pageTitle}>
              Video Call
            </Text>

            <Text style={styles.pageSubtitle}>
              Connect with another phone
            </Text>
          </View>

        </View>

        <View style={styles.callCard}>

          <View style={styles.callIconCircle}>
            <Text style={styles.callIcon}>
              📹
            </Text>
          </View>

          <Text style={styles.callTitle}>
            Start a Kelvin Live call
          </Text>

          <Text style={styles.callDescription}>
            Create a secure call link and send it
            to the person you want to call.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {}}
          >
            <Text style={styles.primaryButtonText}>
              Create Call
            </Text>

            <Text style={styles.primaryArrow}>
              →
            </Text>
          </Pressable>

        </View>

        <View style={styles.callInfo}>

          <Text style={styles.callInfoTitle}>
            How it will work
          </Text>

          <InfoRow
            number="1"
            text="Create a call"
          />

          <InfoRow
            number="2"
            text="Send the call link to the other phone"
          />

          <InfoRow
            number="3"
            text="Both phones join the same call"
          />

          <InfoRow
            number="4"
            text="Choose your camera or avatar"
          />

        </View>

      </View>
    </SafeAreaView>
  );
}

function InfoRow({ number, text }) {
  return (
    <View style={styles.infoRow}>

      <View style={styles.infoNumber}>
        <Text style={styles.infoNumberText}>
          {number}
        </Text>
      </View>

      <Text style={styles.infoText}>
        {text}
      </Text>

    </View>
  );
}

function ComingSoonScreen({
  title,
  subtitle,
  icon,
  onBack,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.comingContainer}>

        <View style={styles.pageHeader}>

          <Pressable
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ←
            </Text>
          </Pressable>

          <View>
            <Text style={styles.pageTitle}>
              {title}
            </Text>

            <Text style={styles.pageSubtitle}>
              Kelvin Live
            </Text>
          </View>

        </View>

        <View style={styles.comingContent}>

          <View style={styles.comingIcon}>
            <Text style={styles.comingIconText}>
              {icon}
            </Text>
          </View>

          <Text style={styles.comingTitle}>
            {title}
          </Text>

          <Text style={styles.comingSubtitle}>
            {subtitle}
          </Text>

          <View style={styles.buildingBadge}>
            <Text style={styles.buildingText}>
              BUILDING THIS FEATURE
            </Text>
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallLogo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  smallLogoText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },

  brandName: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationIcon: {
    color: '#111827',
    fontSize: 24,
  },

  greetingCard: {
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: '#111827',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },

  greetingTextArea: {
    flex: 1,
    paddingRight: 10,
  },

  greeting: {
    color: '#d0d5dd',
    fontSize: 14,
    marginBottom: 6,
  },

  greetingTitle: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },

  greetingSubtitle: {
    color: '#d0d5dd',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  greetingLogo: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  greetingLogoText: {
    color: '#111827',
    fontSize: 36,
    fontWeight: '800',
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 13,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  featureCard: {
    width: '48%',
    minHeight: 175,
    borderRadius: 22,
    backgroundColor: '#f8f9fb',
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eaecf0',
  },

  largeFeatureCard: {
    minHeight: 190,
  },

  featurePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  featureIconText: {
    fontSize: 23,
  },

  featureTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },

  featureSubtitle: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    paddingRight: 4,
  },

  featureArrow: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    color: '#111827',
    fontSize: 20,
  },

  aiBanner: {
    borderRadius: 22,
    backgroundColor: '#111827',
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 28,
  },

  aiBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  aiBannerIconText: {
    fontSize: 22,
  },

  aiBannerText: {
    flex: 1,
  },

  aiBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  aiBannerSubtitle: {
    color: '#d0d5dd',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  aiBannerArrow: {
    color: '#ffffff',
    fontSize: 23,
    marginLeft: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  viewAll: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 13,
  },

  emptyRecent: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eaecf0',
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  emptyTitle: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptySubtitle: {
    color: '#98a2b3',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eaecf0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65,
  },

  navIcon: {
    color: '#98a2b3',
    fontSize: 22,
    marginBottom: 3,
  },

  navLabel: {
    color: '#98a2b3',
    fontSize: 11,
    fontWeight: '600',
  },

  navActive: {
    color: '#111827',
  },

  callContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  backText: {
    color: '#111827',
    fontSize: 25,
  },

  pageTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },

  pageSubtitle: {
    color: '#667085',
    fontSize: 13,
    marginTop: 3,
  },

  callCard: {
    borderRadius: 26,
    backgroundColor: '#111827',
    padding: 28,
    alignItems: 'center',
  },

  callIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  callIcon: {
    fontSize: 30,
  },

  callTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  callDescription: {
    color: '#d0d5dd',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },

  primaryButton: {
    marginTop: 25,
    height: 55,
    minWidth: 210,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },

  primaryArrow: {
    color: '#111827',
    fontSize: 21,
    marginLeft: 10,
  },

  callInfo: {
    marginTop: 30,
  },

  callInfoTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  infoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  infoNumberText: {
    color: '#111827',
    fontWeight: '800',
  },

  infoText: {
    color: '#475467',
    fontSize: 14,
    flex: 1,
  },

  comingContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },

  comingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },

  comingIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  comingIconText: {
    fontSize: 40,
  },

  comingTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  comingSubtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 10,
  },

  buildingBadge: {
    marginTop: 22,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#f2f4f7',
  },

  buildingText: {
    color: '#475467',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
