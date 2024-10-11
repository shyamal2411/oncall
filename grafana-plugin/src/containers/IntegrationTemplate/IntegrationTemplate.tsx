import React, { useCallback, useState, useEffect } from 'react';

import { Button, Drawer, Stack, useStyles2 } from '@grafana/ui';
import { LocationHelper } from 'helpers/LocationHelper';
import { UserActions } from 'helpers/authorization/authorization';
import { debounce } from 'lodash-es';
import { observer } from 'mobx-react';

import { getTemplatesForEdit } from 'components/AlertTemplates/AlertTemplatesForm.config';
import { TemplateForEdit } from 'components/AlertTemplates/CommonAlertTemplatesForm.config';
import { CheatSheet } from 'components/CheatSheet/CheatSheet';
import {
  groupingTemplateCheatSheet,
  slackMessageTemplateCheatSheet,
  genericTemplateCheatSheet,
  alertGroupDynamicLabelCheatSheet,
  alertGroupMultiLabelExtractionCheatSheet,
} from 'components/CheatSheet/CheatSheet.config';
import { MonacoEditor } from 'components/MonacoEditor/MonacoEditor';
import { Text } from 'components/Text/Text';
import { TemplatePage } from 'containers/TemplatePreview/TemplatePreview';
import { TemplateResult } from 'containers/TemplateResult/TemplateResult';
import { TemplatesAlertGroupsList } from 'containers/TemplatesAlertGroupsList/TemplatesAlertGroupsList';
import { WithPermissionControlTooltip } from 'containers/WithPermissionControl/WithPermissionControlTooltip';
import { AlertTemplatesDTO } from 'models/alert_templates/alert_templates';
import { ChannelFilter } from 'models/channel_filter/channel_filter.types';
import { ApiSchemas } from 'network/oncall-api/api.types';
import { IntegrationTemplateOptions, LabelTemplateOptions } from 'pages/integration/IntegrationCommon.config';
import { useStore } from 'state/useStore';

import { getIntegrationTemplateStyles } from './IntegrationTemplate.styles';

interface IntegrationTemplateProps {
  id: ApiSchemas['AlertReceiveChannel']['id'];
  channelFilterId?: ChannelFilter['id'];
  template: TemplateForEdit;
  templateBody: string;
  templates: AlertTemplatesDTO[];
  onHide: () => void;
  onUpdateTemplates: (values: any) => void;
  onUpdateRoute?: (values: any, channelFilterId?: ChannelFilter['id']) => void;
}

export const IntegrationTemplate = observer((props: IntegrationTemplateProps) => {
  const { id, onHide, template, onUpdateTemplates, onUpdateRoute, templateBody, channelFilterId, templates } = props;

  const [isCheatSheetVisible, setIsCheatSheetVisible] = useState<boolean>(false);
  const [chatOpsPermalink, setChatOpsPermalink] = useState(undefined);
  const [alertGroupPayload, setAlertGroupPayload] = useState<{ [key: string]: unknown }>(undefined);
  const [changedTemplateBody, setChangedTemplateBody] = useState<string>(templateBody);
  const [resultError, setResultError] = useState<string>(undefined);
  const [isRecentAlertGroupExisting, setIsRecentAlertGroupExisting] = useState<boolean>(false);

  const styles = useStyles2(getIntegrationTemplateStyles);
  const store = useStore();

  useEffect(() => {
    const templateForEdit = getTemplatesForEdit(store.features);

    if (templateForEdit[template.name]) {
      const locationParams: any = { template: template.name };
      if (template.isRoute) {
        locationParams.routeId = channelFilterId;
      }
      LocationHelper.update(locationParams, 'partial');
    }
  }, []);

  const onShowCheatSheet = useCallback(() => {
    setIsCheatSheetVisible(true);
  }, []);

  const onCloseCheatSheet = useCallback(() => {
    setIsCheatSheetVisible(false);
  }, []);

  const getChangeHandler = () => {
    return debounce((value: string) => {
      setChangedTemplateBody(value);
    }, 500);
  };

  const onEditPayload = (alertPayload: string) => {
    if (alertPayload !== null) {
      try {
        const jsonPayload = JSON.parse(alertPayload);
        if (typeof jsonPayload === 'object') {
          setResultError(undefined);
          setAlertGroupPayload(JSON.parse(alertPayload));
        } else {
          setResultError('Please check your JSON format');
        }
      } catch (e) {
        setResultError(e.message);
      }
    } else {
      setResultError(undefined);
      setAlertGroupPayload(undefined);
    }
  };

  const onSelectAlertGroup = useCallback((alertGroup: ApiSchemas['AlertGroup']) => {
    if (template.additionalData?.chatOpsName) {
      setChatOpsPermalink({
        permalink: alertGroup?.permalinks[template.additionalData?.chatOpsName],
      });
    }
  }, []);

  const onLoadAlertGroupsList = useCallback((isAlertGroup: boolean) => {
    setIsRecentAlertGroupExisting(isAlertGroup);
  }, []);

  const onSaveAndFollowLink = useCallback(
    (link: string) => {
      onUpdateTemplates({ [template.name]: changedTemplateBody });
      window.open(link, '_blank');
    },
    [onUpdateTemplates, onUpdateRoute, changedTemplateBody]
  );

  const handleSubmit = useCallback(() => {
    if (template.isRoute) {
      onUpdateRoute({ [template.name]: changedTemplateBody }, channelFilterId);
    } else {
      onUpdateTemplates({ [template.name]: changedTemplateBody });
    }
  }, [onUpdateTemplates, changedTemplateBody]);

  const getCheatSheet = (templateKey: string) => {
    switch (templateKey) {
      case IntegrationTemplateOptions.Grouping.key:
      case IntegrationTemplateOptions.Resolve.key:
        return groupingTemplateCheatSheet;
      case IntegrationTemplateOptions.WebTitle.key:
      case IntegrationTemplateOptions.WebMessage.key:
      case IntegrationTemplateOptions.WebImage.key:
        return genericTemplateCheatSheet;
      case IntegrationTemplateOptions.Autoacknowledge.key:
      case IntegrationTemplateOptions.SourceLink.key:
      case IntegrationTemplateOptions.Phone.key:
      case IntegrationTemplateOptions.SMS.key:
      case IntegrationTemplateOptions.SlackTitle.key:
      case IntegrationTemplateOptions.SlackMessage.key:
      case IntegrationTemplateOptions.SlackImage.key:
      case IntegrationTemplateOptions.TelegramTitle.key:
      case IntegrationTemplateOptions.TelegramMessage.key:
      case IntegrationTemplateOptions.TelegramImage.key:
      case IntegrationTemplateOptions.EmailTitle.key:
      case IntegrationTemplateOptions.EmailMessage.key:
      case IntegrationTemplateOptions.MobileAppTitle.key:
      case IntegrationTemplateOptions.MobileAppMessage.key:
        return slackMessageTemplateCheatSheet;
      case LabelTemplateOptions.AlertGroupDynamicLabel.key:
        return alertGroupDynamicLabelCheatSheet;
      case LabelTemplateOptions.AlertGroupMultiLabel.key:
        return alertGroupMultiLabelExtractionCheatSheet;
      default:
        return genericTemplateCheatSheet;
    }
  };
  return (
    <Drawer
      title={
        <div className={styles.titleContainer}>
          <Stack justifyContent="space-between" alignItems="flex-start">
            <Stack direction="column">
              <Text.Title level={3}>Edit {template.displayName} template</Text.Title>
              {template.description && <Text type="secondary">{template.description}</Text>}
            </Stack>

            <Stack>
              <WithPermissionControlTooltip userAction={UserActions.IntegrationsWrite}>
                <Button variant="secondary" onClick={onHide}>
                  Cancel
                </Button>
              </WithPermissionControlTooltip>
              <WithPermissionControlTooltip userAction={UserActions.IntegrationsWrite}>
                <Button variant="primary" onClick={handleSubmit}>
                  Save
                </Button>
              </WithPermissionControlTooltip>
            </Stack>
          </Stack>
        </div>
      }
      onClose={onHide}
      closeOnMaskClick={false}
      width={'95%'}
    >
      <div className={styles.containerWrapper}>
        <div className={styles.container}>
          <TemplatesAlertGroupsList
            templatePage={TemplatePage.Integrations}
            alertReceiveChannelId={id}
            onEditPayload={onEditPayload}
            onSelectAlertGroup={onSelectAlertGroup}
            templates={templates}
            onLoadAlertGroupsList={onLoadAlertGroupsList}
          />
          {renderCheatSheet()}
          <TemplateResult
            alertReceiveChannelId={id}
            template={template}
            templateBody={changedTemplateBody}
            isAlertGroupExisting={isRecentAlertGroupExisting}
            chatOpsPermalink={chatOpsPermalink}
            payload={alertGroupPayload}
            error={resultError}
            onSaveAndFollowLink={onSaveAndFollowLink}
          />
        </div>
      </div>
    </Drawer>
  );

  function renderCheatSheet() {
    if (isCheatSheetVisible) {
      return (
        <CheatSheet
          cheatSheetName={template.displayName}
          cheatSheetData={getCheatSheet(template.name)}
          onClose={onCloseCheatSheet}
        />
      );
    }

    return (
      <>
        <div className={styles.templateBlockCodeEditor}>
          <div className={styles.templateEditorBlockTitle}>
            <Stack justifyContent="space-between" alignItems="center" wrap="wrap">
              <Text>Template editor</Text>

              <Button variant="secondary" fill="outline" onClick={onShowCheatSheet} icon="book" size="sm">
                Cheatsheet
              </Button>
            </Stack>
          </div>
          <div className={styles.templateEditorBlockContent}>
            <MonacoEditor
              value={changedTemplateBody}
              data={templates}
              showLineNumbers={true}
              height="100%"
              onChange={getChangeHandler()}
            />
          </div>
        </div>
      </>
    );
  }
});

export default IntegrationTemplate;
