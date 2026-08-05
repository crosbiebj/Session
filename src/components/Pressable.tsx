import { Pressable as RNPressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedRNPressable = Animated.createAnimatedComponent(RNPressable);

// A native "press scale" feel — the same spring-down-and-back that iOS's
// own buttons/cards use — instead of a flat opacity swap. Drop-in
// replacement for react-native's Pressable in the spots that matter most
// (buttons, cards, the FAB).
export function Pressable({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { scaleTo?: number }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedRNPressable
      style={[style as never, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      {...props}
    />
  );
}
