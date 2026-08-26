









import React, { useState, useEffect } from "react";
import { BackHandler } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, session } from "../../api";
import { errorMessage, unwrap } from "../../lib/format";
import { handleGoogleLogin } from "../../services/google-auth";
import TelaLogin from "./tela-login";
import TelaCadastro from "../cadastro/tela-cadastro";
import TelaVerificacao from "../verificacao/tela-verificacao";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";

export default function AuthScreen({ onAuthenticated }) {

  const [mode, setMode] = useState("login");


  const [alertModal, setAlertModal] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    buttonText: "Entendido",
    secondaryButtonText: null,
    onSecondaryPress: null
  });

  const showAlert = ({
    type = "error",
    title,
    message,
    buttonText = "Entendido",
    secondaryButtonText = null,
    onSecondaryPress = null
  }) => {
    setAlertModal({
      visible: true,
      type,
      title,
      message,
      buttonText,
      secondaryButtonText,
      onSecondaryPress
    });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, visible: false }));
  };


  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);


  const [step, setStep] = useState(1);
  const [isGoogleProvider, setIsGoogleProvider] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [bio, setBio] = useState("");


  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [resending, setResending] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [verifiedRewardUser, setVerifiedRewardUser] = useState(null);


  useEffect(() => {
    const handleBackPress = () => {
      if (alertModal.visible) {
        setAlertModal((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (showRewardModal) {
        setShowRewardModal(false);
        return true;
      }
      if (mode === "register") {
        if (step > 1) {
          setStep(step - 1);
          return true;
        } else {
          setMode("login");
          return true;
        }
      }
      if (mode === "verify") {
        setMode("login");
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => backHandler.remove();
  }, [mode, step, alertModal.visible, showRewardModal]);


  const applyGoogleProfile = (profile) => {
    if (!profile) return;
    setIsGoogleProvider(true);
    if (profile.idToken) setGoogleIdToken(profile.idToken);
    if (profile.email) {
      setRegEmail(profile.email);
      setVerifyEmail(profile.email);
    }
    if (profile.givenName) {
      setFirstName(profile.givenName);
    } else if (profile.fullName) {
      const parts = profile.fullName.trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (profile.familyName) setLastName(profile.familyName);
    if (profile.avatarUrl) setAvatarUri(profile.avatarUrl);
  };


  const onGoogleLogin = async () => {
    try {
      setGoogleBusy(true);
      const result = await handleGoogleLogin({
        onAuthenticated: (user) => onAuthenticated(user),
        onNewUser: (profile) => {
          applyGoogleProfile(profile);
          setStep(1);
          setMode("register");
        }
      });
      if (result?.googleProfile && !result?.user) {
        applyGoogleProfile(result.googleProfile);
        setStep(1);
        setMode("register");
      }
    } catch (error) {
      showAlert({
        type: "warning",
        title: "Aviso Google",
        message: errorMessage(error)
      });
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = loginEmail.trim();
    const trimmedPassword = loginPassword;


    if (!trimmedEmail && !trimmedPassword) {
      return showAlert({
        type: "warning",
        title: "Campos vazios",
        message: "Por favor, preencha o e-mail e a senha para entrar na Tribo."
      });
    }

    if (!trimmedEmail) {
      return showAlert({
        type: "warning",
        title: "E-mail obrigatório",
        message: "Por favor, informe seu endereço de e-mail para continuar."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return showAlert({
        type: "warning",
        title: "E-mail inválido",
        message: "O formato do e-mail digitado não é válido. Verifique e tente novamente."
      });
    }

    if (!trimmedPassword) {
      return showAlert({
        type: "warning",
        title: "Senha obrigatória",
        message: "Por favor, digite sua senha para entrar na Tribo."
      });
    }

    try {
      setBusy(true);
      const response = await api.login(trimmedEmail, trimmedPassword);
      const token = response?.token || response?.data?.token;
      if (!token) throw new Error("A API não retornou o token de acesso.");
      await session.save(token);
      onAuthenticated(unwrap(response, "user"));
    } catch (error) {
      console.log("Erro login:", error);
      const msg = (errorMessage(error) || "").toLowerCase();
      const status = error?.status || error?.response?.status;

      const isInvalidCreds =
      status === 401 ||
      status === 400 ||
      msg.includes("password") ||
      msg.includes("senha") ||
      msg.includes("credential") ||
      msg.includes("credenciais") ||
      msg.includes("invalid") ||
      msg.includes("inválid") ||
      msg.includes("incorret") ||
      msg.includes("não encontrado") ||
      msg.includes("user not found") ||
      msg.includes("unauthorized");

      if (isInvalidCreds) {
        showAlert({
          type: "error",
          title: "Senha ou e-mail incorreto",
          message:
          "A senha digitada está incorreta ou este e-mail não foi encontrado. Verifique suas credenciais e tente novamente."
        });
      } else {
        showAlert({
          type: "error",
          title: "Não foi possível entrar",
          message:
          errorMessage(error) ||
          "Ocorreu uma falha ao tentar autenticar. Verifique sua conexão e tente novamente."
        });
      }
    } finally {
      setBusy(false);
    }
  };


  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        return showAlert({
          type: "warning",
          title: "Permissão necessária",
          message: "Precisamos de permissão para acessar a galeria de fotos."
        });
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Erro ao selecionar foto",
        message: errorMessage(error)
      });
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!firstName.trim()) {
        return showAlert({
          type: "warning",
          title: "Nome obrigatório",
          message: "Por favor, informe seu nome para continuar."
        });
      }
      setStep(2);
    } else if (step === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
        return showAlert({
          type: "warning",
          title: "E-mail inválido",
          message: "Por favor, informe um endereço de e-mail válido."
        });
      }
      setStep(3);
    } else if (step === 3) {
      if (!regPassword || regPassword.length < 6) {
        return showAlert({
          type: "warning",
          title: "Senha fraca",
          message: "A senha deve conter no mínimo 6 caracteres para proteger sua conta."
        });
      }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      await handleRegisterSubmit();
    }
  };

  const handleSkipStep = () => {
    if (step === 4) setStep(5);else
    if (step === 5) handleRegisterSubmit();
  };

  const handleRegisterSubmit = async () => {
    try {
      setBusy(true);
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const payload = {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: regEmail.trim(),
        password: regPassword,
        bio: bio.trim() || undefined,
        isGoogleProvider: !!isGoogleProvider,
        ...(googleIdToken ? { googleIdToken } : {})
      };
      const response = await api.register(payload);
      const token = response?.token || response?.data?.token;
      if (token) await session.save(token);

      if (avatarUri && !avatarUri.startsWith("http")) {
        try {
          await api.uploads.photo(avatarUri);
        } catch (uploadErr) {
          console.log("Nota sobre upload de foto no cadastro:", uploadErr?.message);
        }
      }

      const registeredUser = unwrap(response, "user") || response?.user;

      if (
      isGoogleProvider && (
      response?.email_confirmed_at ||
      registeredUser?.is_verified ||
      response?.alreadyVerified))
      {
        if (token && onAuthenticated) {
          onAuthenticated(
            registeredUser || { email: regEmail.trim(), name: fullName }
          );
          return;
        }
      }

      setVerifyEmail(regEmail.trim());
      setVerifyCode("");
      setMode("verify");

      if (isGoogleProvider) {
        try {
          await api.auth.resendCode(regEmail.trim());
        } catch (sendCodeErr) {
          console.log("Disparo automático de código:", sendCodeErr?.message);
        }
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Não foi possível criar a conta",
        message: errorMessage(error)
      });
    } finally {
      setBusy(false);
    }
  };


  const handleVerifyEmail = async () => {
    const code = verifyCode.trim();
    if (!code || code.length < 6) {
      return showAlert({
        type: "warning",
        title: "Código incompleto",
        message: "Por favor, digite o código de 6 dígitos enviado ao seu e-mail."
      });
    }
    try {
      setBusy(true);
      const response = await api.auth.verifyEmail(verifyEmail, code);
      const token = response?.token || response?.data?.token;
      if (token) await session.save(token);
      const verifiedUser = unwrap(response, "user") || {
        email: verifyEmail,
        badge_type: "BLUE",
        badgeType: "BLUE",
        is_verified: true
      };
      const completeUser = {
        ...verifiedUser,
        badge_type: verifiedUser.badge_type || "BLUE",
        badgeType: verifiedUser.badgeType || "BLUE",
        is_verified: true
      };
      setVerifiedRewardUser(completeUser);
      setShowRewardModal(true);
    } catch (error) {
      showAlert({
        type: "error",
        title: "Código inválido",
        message: errorMessage(error)
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRewardContinue = () => {
    setShowRewardModal(false);
    const userToAuth = verifiedRewardUser || {
      email: verifyEmail,
      badge_type: "BLUE",
      badgeType: "BLUE",
      is_verified: true
    };
    onAuthenticated(userToAuth);
  };

  const handleResendCode = async () => {
    if (!verifyEmail) return;
    try {
      setResending(true);
      await api.auth.resendCode(verifyEmail);
      showAlert({
        type: "success",
        title: "Código reenviado",
        message: `Um novo código de segurança foi enviado para ${verifyEmail}.`
      });
    } catch (error) {
      showAlert({
        type: "error",
        title: "Não foi possível reenviar",
        message: errorMessage(error)
      });
    } finally {
      setResending(false);
    }
  };


  return (
    <>
      {mode === "login" &&
      <TelaLogin
        email={loginEmail}
        onChangeEmail={setLoginEmail}
        password={loginPassword}
        onChangePassword={setLoginPassword}
        showPassword={showLoginPassword}
        onTogglePassword={() => setShowLoginPassword(!showLoginPassword)}
        busy={busy}
        googleBusy={googleBusy}
        onLogin={handleLogin}
        onGoogleLogin={onGoogleLogin}
        onGoToCadastro={() => {setStep(1);setMode("register");}}
        onEsqueciSenha={() =>
        showAlert({
          type: "info",
          title: "Recuperar senha",
          message: "A recuperação de senha estará disponível na próxima atualização da Tribo."
        })
        } />

      }

      {mode === "verify" &&
      <TelaVerificacao
        email={verifyEmail}
        codigo={verifyCode}
        onChangeCodigo={setVerifyCode}
        busy={busy}
        reenviando={resending}
        showModal={showRewardModal}
        onVerificar={handleVerifyEmail}
        onReenviar={handleResendCode}
        onVoltarLogin={() => setMode("login")}
        onContinuar={handleRewardContinue} />

      }

      {mode === "register" &&
      <TelaCadastro
        step={step}
        isGoogleProvider={isGoogleProvider}
        firstName={firstName}
        onChangeFirstName={setFirstName}
        lastName={lastName}
        onChangeLastName={setLastName}
        email={regEmail}
        onChangeEmail={setRegEmail}
        password={regPassword}
        onChangePassword={setRegPassword}
        showPassword={showRegPassword}
        onTogglePassword={() => setShowRegPassword(!showRegPassword)}
        avatarUri={avatarUri}
        onPickAvatar={handlePickAvatar}
        bio={bio}
        onChangeBio={setBio}
        busy={busy}
        onNext={handleNextStep}
        onSkip={handleSkipStep}
        onBack={() => {
          if (step > 1) setStep(step - 1);else
          setMode("login");
        }}
        onGoToLogin={() => setMode("login")}
        onSubmit={handleRegisterSubmit} />

      }

      {}
      <TriboAlertModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        secondaryButtonText={alertModal.secondaryButtonText}
        onSecondaryPress={alertModal.onSecondaryPress}
        onClose={hideAlert} />
      
    </>);

}