import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TextStyle } from "react-native";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  style?: TextStyle;
  suffix?: string;
};

export default function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  style,
  suffix = "",
}: Props) {
  const animated = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const id = animated.addListener(({ value: next }) => {
      setDisplayValue(next);
    });

    Animated.timing(animated, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    return () => {
      animated.removeListener(id);
    };
  }, [animated, duration, value]);

  return (
    <Text style={style}>
      {displayValue.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
