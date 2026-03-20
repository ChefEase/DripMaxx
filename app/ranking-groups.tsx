import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Share,
  Platform,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RankingGroupsScreen() {
  const nav = useNavigation<Nav>();
  const { userId } = useStore();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ name: string; code: string } | null>(null);

  const handleCreate = async () => {
    if (!userId || !groupName.trim()) {
      Alert.alert("Error", "Enter a group name.");
      return;
    }
    setCreating(true);
    try {
      const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const res = await fetch(`${base}/v1/rankings/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), user_id: userId }),
      });
      if (!res.ok) throw new Error(`Create failed ${res.status}`);
      const data = await res.json();
      console.log("[RankingGroups] created", data);
      setCreatedGroup({ name: data.name, code: data.code });
    } catch (e: any) {
      console.error("[RankingGroups] create failed", e);
      Alert.alert("Failed", e?.message || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!userId || !joinCode.trim()) {
      Alert.alert("Error", "Enter the group code.");
      return;
    }
    setJoining(true);
    try {
      const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const res = await fetch(`${base}/v1/rankings/groups/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase(), user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Join failed ${res.status}`);
      }
      const data = await res.json();
      console.log("[RankingGroups] joined", data);
      Alert.alert("Joined!", `You're in ${data.name}`);
      nav.navigate("Leaderboard");
    } catch (e: any) {
      console.error("[RankingGroups] join failed", e);
      Alert.alert("Failed", e?.message || "Invalid or expired code");
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Private Groups</Text>
      </View>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "create" && styles.tabActive]}
          onPress={() => setTab("create")}
        >
          <Text style={[styles.tabText, tab === "create" && styles.tabTextActive]}>Create</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "join" && styles.tabActive]}
          onPress={() => setTab("join")}
        >
          <Text style={[styles.tabText, tab === "join" && styles.tabTextActive]}>Join</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {tab === "create" ? (
          <View style={styles.form}>
            <Text style={styles.label}>Group name</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Squad Goals"
              placeholderTextColor="#6B7280"
            />
            <Pressable
              style={[styles.primaryBtn, creating && styles.disabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.primaryBtnText}>
                {creating ? "Creating..." : "Create & Share Code"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Group code</Text>
            <TextInput
              style={styles.input}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
            />
            <Pressable
              style={[styles.primaryBtn, joining && styles.disabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              <Text style={styles.primaryBtnText}>
                {joining ? "Joining..." : "Join Group"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!createdGroup} transparent animationType="fade" onRequestClose={() => setCreatedGroup(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Group created</Text>
            <Text style={styles.modalText}>{createdGroup?.name}</Text>
            <Text style={styles.modalCode}>{createdGroup?.code}</Text>
            <Text style={styles.modalHint}>Share this code with friends</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalBtn}
                onPress={async () => {
                  if (!createdGroup) return;
                  try {
                    await Share.share({
                      message: `Join my DripMaxx group "${createdGroup.name}"! Code: ${createdGroup.code}`,
                      title: "Join DripMaxx group",
                    });
                  } catch (e) {
                    console.warn("share failed", e);
                  }
                }}
              >
                <Text style={styles.modalBtnText}>Share code</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalSecondary]}
                onPress={() => {
                  setCreatedGroup(null);
                  nav.navigate("Leaderboard");
                }}
              >
                <Text style={styles.modalSecondaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  header: { paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: "#A5B4FC", fontSize: 15, fontWeight: "600" },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "800" },
  tabs: { flexDirection: "row", paddingHorizontal: 24, paddingTop: 20, gap: 8 },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1F2937",
  },
  tabActive: { backgroundColor: "#22C55E" },
  tabText: { color: "#9CA3AF", fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: "#022C22", fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 24 },
  form: { gap: 12 },
  label: { color: "#9CA3AF", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#F9FAFB",
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#022C22", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 8,
  },
  modalTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalText: { color: "#E5E7EB", fontSize: 15, textAlign: "center" },
  modalCode: { color: "#22C55E", fontSize: 28, fontWeight: "900", letterSpacing: 2, textAlign: "center", marginVertical: 8 },
  modalHint: { color: "#9CA3AF", fontSize: 12, textAlign: "center" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  modalBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: { color: "#022C22", fontWeight: "800" },
  modalSecondary: { backgroundColor: "#1F2937", borderWidth: 1, borderColor: "#374151" },
  modalSecondaryText: { color: "#E5E7EB", fontWeight: "700" },
});
