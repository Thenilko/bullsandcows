import i18n from '../i18n'
import { Login } from '../screens/Login'
import { Rules } from '../screens/Rules'

export const LoginScreen = () => <Login />
export const LoginRegisterScreen = () => <Login initial={{ tab: 'register' }} />
export const LoginErrorScreen = () => <Login initial={{ message: i18n.t('login.validation.nameShort') }} />
export const RulesScreen = () => <Rules />
