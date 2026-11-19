import { Alert } from 'react-native';
export function confirmDestructive(title: string, message: string, action: () => void) {
 Alert.alert(title, message, [{text:'Cancel',style:'cancel'},{text:title,style:'destructive',onPress:action}]);
}
