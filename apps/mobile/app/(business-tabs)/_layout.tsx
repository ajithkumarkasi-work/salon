import { Tabs } from 'expo-router';
import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Settings, Users } from 'lucide-react-native';

export default function BusinessTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c0142f',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f1f1',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          headerTitle: 'Business Overview',
          tabBarIcon: ({ color, focused }) => <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => <ClipboardList size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => <CalendarDays size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => <Users size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => <Settings size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
    </Tabs>
  );
}