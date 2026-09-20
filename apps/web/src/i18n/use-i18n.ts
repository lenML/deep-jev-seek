import { messages, type MessageKey, type MessageVariables } from "@/i18n/messages";
import { useWorkbenchStore } from "@/store/workbench";

function interpolate(message: string, variables?: MessageVariables) {
  if (!variables) {
    return message;
  }

  return message.replace(/\{(\w+)\}/gu, (_, key: string) =>
    variables[key] === undefined ? `{${key}}` : String(variables[key]),
  );
}

export function useI18n() {
  const language = useWorkbenchStore((state) => state.language);
  const setLanguage = useWorkbenchStore((state) => state.setLanguage);

  return {
    language,
    setLanguage,
    t: (key: MessageKey, variables?: MessageVariables) =>
      interpolate(messages[language][key], variables),
  };
}
