{{/* feature-10042026-Maurice: shared labels, images, and pod hardening helpers. */}}
{{- define "platform-library.name" -}}{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}{{- end -}}
{{- define "platform-library.fullname" -}}{{- if .Values.fullnameOverride }}{{ .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}{{- else }}{{ include "platform-library.name" . }}{{- end -}}{{- end -}}
{{- define "platform-library.labels" -}}
app.kubernetes.io/name: {{ include "platform-library.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: aguda-deskworks
platform.aguda.dev/environment: {{ .Values.environment | quote }}
{{- end -}}
{{- define "platform-library.selectorLabels" -}}app.kubernetes.io/name: {{ include "platform-library.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}{{- end -}}
{{- define "platform-library.image" -}}
{{- $image := .image -}}
{{- if and (or (eq $.Values.environment "staging") (eq $.Values.environment "prod")) (not $image.digest) -}}{{- fail (printf "immutable image digest required for %s: %s" $.Values.environment $image.repository) -}}{{- end -}}
{{- if $image.digest }}{{ $image.repository }}@{{ $image.digest }}{{ else }}{{ $image.repository }}:{{ required (printf "image tag required for %s" $image.repository) $image.tag }}{{ end -}}
{{- end -}}
{{- define "platform-library.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
fsGroup: 10001
seccompProfile:
  type: RuntimeDefault
{{- end -}}
{{- define "platform-library.containerSecurityContext" -}}
privileged: false
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end -}}
{{- define "platform-library.spread" -}}
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels: {{ include "platform-library.selectorLabels" . | nindent 8 }}
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels: {{ include "platform-library.selectorLabels" . | nindent 8 }}
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          topologyKey: kubernetes.io/hostname
          labelSelector:
            matchLabels: {{ include "platform-library.selectorLabels" . | nindent 12 }}
{{- end -}}
