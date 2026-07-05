import { CommonActions, type NavigationProp } from '@react-navigation/native';

/** Leave a nested section (Home Services / Real Estate) and return to Home. */
export function exitSection(navigation: NavigationProp<any>) {
  const parent = navigation.getParent();
  if (parent?.canGoBack()) {
    parent.goBack();
    return;
  }
  parent?.navigate('Home' as never);
}

/** Reset the current section stack to its root screen (e.g. dashboard → hub). */
export function goToSectionRoot(navigation: NavigationProp<any>, rootScreen: string) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: rootScreen }],
    }),
  );
}

/** Open a screen on the main app stack from inside a nested section. */
export function navigateToRootScreen(
  navigation: NavigationProp<any>,
  screen: string,
  params?: object,
) {
  navigation.getParent()?.navigate(screen as never, params as never);
}
