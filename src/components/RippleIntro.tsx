import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const RING_COLORS = ['#5C7A4C', '#C9974A', '#5C7A4C'];

function Ring({ color, delay }: { color: string; delay: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(2.4, { duration: 1100, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(delay, withTiming(0, { duration: 1100, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          height: 90,
          width: 90,
          borderRadius: 45,
          borderWidth: 1.5,
          borderColor: color,
        },
      ]}
    />
  );
}

// "Something cool to make you feel like you're working with a living
// breathing app" — a brief water-ripple moment every time the app opens,
// not tied to auth specifically (root layout mounts this once fonts +
// session are both resolved, regardless of which screen comes next).
// Self-contained: calls onFinish once and the parent unmounts it, rather
// than leaving an invisible overlay sitting there catching touches.
export function RippleIntro({ onFinish }: { onFinish: () => void }) {
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    contentOpacity.value = withSequence(
      withDelay(1150, withTiming(1, { duration: 0 })),
      withTiming(0, { duration: 320 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      style={[StyleSheet.absoluteFill, containerStyle, styles.container]}
      pointerEvents="none"
    >
      <View style={styles.rings}>
        {RING_COLORS.map((color, i) => (
          <Ring key={i} color={color} delay={i * 220} />
        ))}
      </View>
      <Animated.Text
        entering={FadeIn.duration(500).delay(250)}
        style={styles.wordmark}
      >
        <Text style={{ color: '#EDEBE0' }}>(OB)</Text>
        <Text style={{ color: '#C9974A' }}>Session</Text>
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#14170F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  rings: {
    height: 90,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    position: 'absolute',
    bottom: '38%',
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
  },
});
