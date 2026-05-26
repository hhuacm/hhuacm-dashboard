import { Alert, Chip } from "@heroui/react";

const previewPidLimit = 80;

interface ProblemPidPreviewProps {
  duplicatePids: string[];
  invalidPids: string[];
  pids: string[];
  readyLabel: string;
}

export function ProblemPidPreview({
  duplicatePids,
  invalidPids,
  pids,
  readyLabel,
}: ProblemPidPreviewProps) {
  const visiblePids = pids.slice(0, previewPidLimit);
  const hiddenPidCount = Math.max(0, pids.length - visiblePids.length);
  const hasProblemPids = pids.length > 0;
  const hasParseErrors = invalidPids.length > 0 || duplicatePids.length > 0;

  return (
    <div className="grid gap-3 rounded-lg border bg-surface-secondary p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">解析预览</p>
          <p className="text-muted text-sm">
            {hasProblemPids ? `共 ${pids.length} 道题` : "尚未解析到题号"}
          </p>
        </div>
        {hasParseErrors ? (
          <Chip color="danger" size="sm" variant="soft">
            需要修正
          </Chip>
        ) : (
          <Chip
            color={hasProblemPids ? "accent" : "default"}
            size="sm"
            variant="soft"
          >
            {hasProblemPids ? readyLabel : "等待输入"}
          </Chip>
        )}
      </div>

      {invalidPids.length > 0 ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>存在非法题号</Alert.Title>
            <Alert.Description>{invalidPids.join("、")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {duplicatePids.length > 0 ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>存在重复题号</Alert.Title>
            <Alert.Description>{duplicatePids.join("、")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {hasProblemPids ? (
        <div className="flex max-h-48 flex-wrap gap-2 overflow-auto">
          {visiblePids.map((pid, index) => (
            <Chip
              className="font-mono"
              key={`${pid}-${index}`}
              size="sm"
              variant="soft"
            >
              {pid}
            </Chip>
          ))}
          {hiddenPidCount > 0 ? (
            <Chip size="sm" variant="soft">
              还有 {hiddenPidCount} 个
            </Chip>
          ) : null}
        </div>
      ) : (
        <p className="text-muted text-sm leading-6">
          支持英文逗号、中文逗号、换行和空格分隔。
        </p>
      )}
    </div>
  );
}
