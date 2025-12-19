import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import UploadHistoryScreen from '@/screens/upload-history.screen';

export default function UploadHistoryRoute() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <UploadHistoryScreen />
        </SafeAreaView>
    );
}
