{{/* feature-10042026-Maurice: application-local names and environment guards. */}}
{{- define "aguda.fullname" -}}{{ include "platform-library.fullname" . }}{{- end -}}
{{- define "aguda.labels" -}}{{ include "platform-library.labels" . }}{{- end -}}
{{- define "aguda.selector" -}}{{ include "platform-library.selectorLabels" . }}{{- end -}}
{{- define "aguda.externalSecrets" -}}
{{- if and (or (eq .Values.environment "staging") (eq .Values.environment "prod")) (eq (len .Values.externalSecrets) 0) -}}{{ fail (printf "externalSecrets required for %s" .Values.environment) }}{{- end -}}
{{- range .Values.externalSecrets }}{{ . | quote }}{{- end -}}
{{- end -}}
