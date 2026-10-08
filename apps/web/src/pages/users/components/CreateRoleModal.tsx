import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { PermissionCatalogSubject, Role } from '@uims/shared-types';
import { App, Form, Input, Modal, Radio, Select } from 'antd';
import React, { useState } from 'react';
import { rolesService } from '../../../services/roles.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules, isValidationError } from '../../../utils/formValidators';

interface CreateRoleModalProps {
  open: boolean;
  catalog: PermissionCatalogSubject[];
  existingRoles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  open,
  catalog,
  existingRoles,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [presetType, setPresetType] = useState<'empty' | 'readonly' | 'clone'>('empty');
  const [cloneSourceId, setCloneSourceId] = useState<string>('');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      let permissionIds: string[] = [];
      if (presetType === 'readonly') {
        catalog.forEach((cat) => {
          cat.actions.forEach((act) => {
            if (act.action === 'read' || act.action === 'export') {
              permissionIds.push(act.id);
            }
          });
        });
      } else if (presetType === 'clone' && cloneSourceId) {
        const srcRole = existingRoles.find((r) => r.id === cloneSourceId);
        if (srcRole?.permissions) {
          permissionIds = srcRole.permissions
            .map((p: unknown) => {
              const pObj = p as { permission?: { id: string }; id?: string };
              return pObj.permission ? pObj.permission.id : pObj.id || '';
            })
            .filter(Boolean);
        }
      }

      await rolesService.createRole({
        name: values.name.trim(),
        description: values.description?.trim(),
        permissionIds: permissionIds.length > 0 ? permissionIds : undefined,
      });

      message.success(`Role "${values.name}" created successfully.`);
      form.resetFields();
      setPresetType('empty');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'create role'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          Create Role
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Create Role"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ preset: 'empty' }}
        validateTrigger={['onChange', 'onBlur']}
        scrollToFirstError={true}
      >
        <Form.Item
          name="name"
          label="Role Name"
          rules={[
            formRules.required('Role name'),
            formRules.stringRange('Role name', 2, 50),
          ]}
        >
          <Input placeholder="e.g. Junior Network Administrator" autoFocus />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[formRules.maxString('Description', 255)]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe role responsibilities and access scopes..."
          />
        </Form.Item>

        <Form.Item label="Initial Permissions">
          <Radio.Group
            value={presetType}
            onChange={(e) => setPresetType(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            <Radio value="empty">Empty</Radio>
            <Radio value="readonly">Read-Only</Radio>
            <Radio value="clone">Clone from Existing Role</Radio>
          </Radio.Group>

          {presetType === 'clone' && (
            <Select
              placeholder="Select role to copy permissions from..."
              value={cloneSourceId || undefined}
              onChange={setCloneSourceId}
              style={{ width: '100%', marginTop: 8 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={existingRoles.map((r) => ({
                label: `${r.name} (${r.isSystem ? 'System' : 'Custom'} - ${r.permissionCount || 0} permissions)`,
                value: r.id,
              }))}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};
