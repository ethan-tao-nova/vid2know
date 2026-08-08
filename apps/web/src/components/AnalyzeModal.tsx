import { useEffect, useState } from "react";
import { Alert, Modal, Select, Space, Typography } from "antd";
import { useT } from "../i18n/LocaleContext";
import type { Provider, PromptTemplate } from "../api/client";

export type AnalyzeSelection = {
  provider_ids: string[];
  template_id?: string;
};

export default function AnalyzeModal({
  open,
  providers,
  templates,
  defaultProviderIds = [],
  defaultTemplateId,
  confirmLoading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  providers: Provider[];
  templates: PromptTemplate[];
  defaultProviderIds?: string[];
  defaultTemplateId?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (sel: AnalyzeSelection) => void;
}) {
  const t = useT();
  const [providerIds, setProviderIds] = useState<string[]>(defaultProviderIds);
  const [templateId, setTemplateId] = useState<string | undefined>(
    defaultTemplateId
  );

  useEffect(() => {
    if (open) {
      setProviderIds(defaultProviderIds);
      setTemplateId(defaultTemplateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const enabled = providers.filter((p) => p.enabled && p.has_api_key);

  return (
    <Modal
      title={t.analyze.title}
      open={open}
      onCancel={onCancel}
      okText={t.analyze.start}
      cancelText={t.common.cancel}
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: providerIds.length === 0 }}
      onOk={() => onSubmit({ provider_ids: providerIds, template_id: templateId })}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Text type="secondary">{t.analyze.hint}</Typography.Text>
        {enabled.length === 0 ? (
          <Alert type="info" showIcon message={t.home.noProviders} />
        ) : (
          <div>
            <Typography.Text strong>{t.analyze.selectProviders}</Typography.Text>
            <Select
              mode="multiple"
              style={{ width: "100%", marginTop: 6 }}
              placeholder={t.analyze.selectProviders}
              value={providerIds}
              onChange={setProviderIds}
              options={enabled.map((p) => ({
                label: `${p.name} · ${p.default_model}`,
                value: p.id,
              }))}
            />
          </div>
        )}
        <div>
          <Typography.Text strong>{t.analyze.selectTemplate}</Typography.Text>
          <Select
            allowClear
            style={{ width: "100%", marginTop: 6 }}
            placeholder={t.analyze.noneTemplate}
            value={templateId}
            onChange={(v) => setTemplateId(v)}
            options={templates.map((tpl) => ({
              label: tpl.name,
              value: tpl.id,
            }))}
          />
        </div>
      </Space>
    </Modal>
  );
}
