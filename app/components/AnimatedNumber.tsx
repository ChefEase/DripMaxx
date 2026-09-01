import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TextStyle } from "react-native";

type Props = {
  value: number;
  fromValue?: number;
  duration?: number;
  decimals?: number;
  style?: TextStyle;
  suffix?: string;
};

export default function AnimatedNumber({
  value,
  fromValue = 0,
  duration = 900,
  decimals = 0,
  style,
  suffix = "",
}: Props) {
  const animated = useRef(new Animated.Value(fromValue)).current;
  const [displayValue, setDisplayValue] = useState(fromValue);

  useEffect(() => {
    animated.setValue(fromValue);
    setDisplayValue(fromValue);
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
  }, [animated, duration, fromValue, value]);

  return (
    <Text style={style}>
      {displayValue.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
