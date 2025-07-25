import assert from 'assert';
import sinon from 'sinon';
import auth from '../../../../Auth.js';
import { cli } from '../../../../cli/cli.js';
import { CommandInfo } from '../../../../cli/CommandInfo.js';
import { Logger } from '../../../../cli/Logger.js';
import { CommandError } from '../../../../Command.js';
import config from '../../../../config.js';
import request from '../../../../request.js';
import { telemetry } from '../../../../telemetry.js';
import { pid } from '../../../../utils/pid.js';
import { session } from '../../../../utils/session.js';
import { sinonUtil } from '../../../../utils/sinonUtil.js';
import { spo } from '../../../../utils/spo.js';
import commands from '../../commands.js';
import command from './site-set.js';
import { entraGroup } from '../../../../utils/entraGroup.js';

describe(commands.SITE_SET, () => {
  let log: string[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;
  let commandInfo: CommandInfo;
  let loggerLogToStderrSpy: sinon.SinonSpy;
  let waitUntilFinishedStub: sinon.SinonStub;

  before(() => {
    sinon.stub(auth, 'restoreAuth').resolves();
    sinon.stub(telemetry, 'trackEvent').resolves();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
    sinon.stub(spo, 'getRequestDigest').resolves({
      FormDigestValue: 'ABC',
      FormDigestTimeoutSeconds: 1800,
      FormDigestExpiresAt: new Date(),
      WebFullUrl: 'https://contoso.sharepoint.com'
    });
    auth.connection.active = true;
    commandInfo = cli.getCommandInfo(command);
    auth.connection.spoUrl = 'https://contoso.sharepoint.com';
    auth.connection.spoTenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
  });

  beforeEach(() => {
    log = [];
    logger = {
      log: async (msg: string) => {
        log.push(msg);
      },
      logRaw: async (msg: string) => {
        log.push(msg);
      },
      logToStderr: async (msg: string) => {
        log.push(msg);
      }
    };
    loggerLogSpy = sinon.spy(logger, 'log');
    loggerLogToStderrSpy = sinon.spy(logger, 'logToStderr');
    sinon.stub(spo, 'getSpoAdminUrl').resolves('https://contoso-admin.sharepoint.com');
    waitUntilFinishedStub = sinon.stub(spo, 'waitUntilFinished').resolves();
  });

  afterEach(() => {
    sinonUtil.restore([
      request.post,
      request.get,
      spo.getSpoAdminUrl,
      spo.waitUntilFinished,
      spo.applySiteDesign,
      entraGroup.setGroup
    ]);
  });

  after(() => {
    sinon.restore();
    auth.connection.active = false;
    auth.connection.spoUrl = undefined;
    auth.connection.spoTenantId = undefined;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name.startsWith(commands.SITE_SET), true);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('fails validation if the url is not a valid url', async () => {
    const actual = await command.validate({
      options: {
        url: 'ABC', title: 'Team'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the url is not a valid SharePoint url', async () => {
    const actual = await command.validate({
      options: {
        url: 'http://contoso', title: 'Team'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if no option is specified', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the resourceQuota is not a number', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', resourceQuota: 'ABC'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the resourceQuotaWarningLevel is not a number', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', resourceQuotaWarningLevel: 'ABC'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the resourceQuotaWarningLevel is greater than resourceQuota', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        resourceQuotaWarningLevel: 10, resourceQuota: 5
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the storageQuota is not a number', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuota: 'ABC'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the storageQuotaWarningLevel is not a number', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuotaWarningLevel: 'ABC'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the storageQuotaWarningLevel is greater than storageQuota', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuotaWarningLevel: 10, storageQuota: 5
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if sharing is invalid', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'Invalid'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if lockState is invalid', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'Invalid'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if siteLogoUrl is not a string', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: true } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if siteThumbnailUrl is not a string', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: true } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if non-GUID value specified for siteDesignId', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', siteDesignId: 'Invalid' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if allowSelfServiceUpgrade is set to true', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: true
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if allowSelfServiceUpgrade is set to false', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: false
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if lockState is set to Unlock', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'Unlock'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if lockState is set to NoAdditions', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAdditions'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if lockState is set to ReadOnly', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'ReadOnly'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if lockState is set to NoAccess', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if noScriptSite is set to true', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: true
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if noScriptSite is set to false', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: false
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if all options are correct', async () => {
    const actual = await command.validate({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        resourceQuota: 100, resourceQuotaWarningLevel: 90,
        storageQuota: 100, storageQuotaWarningLevel: 90,
        sharingCapability: 'Disabled', allowSelfServiceUpgrade: true,
        owners: 'admin@contoso.com', lockState: 'Unlock', noScriptSite: true
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and classification specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', classification: 'HBI' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and empty classification specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', classification: '' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and disableFlows true specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', disableFlows: true } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and disableFlows false specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', disableFlows: false } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and socialBarOnSitePagesDisabled true specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', socialBarOnSitePagesDisabled: true } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if url and socialBarOnSitePagesDisabled false specified', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', socialBarOnSitePagesDisabled: false } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if true specified for isPublic', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', isPublic: true } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if false specified for isPublic', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', isPublic: false } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if true specified for shareByEmailEnabled', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', shareByEmailEnabled: true } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if false specified for shareByEmailEnabled', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', shareByEmailEnabled: false } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if a valid GUID specified for siteDesignId', async () => {
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation if non existing sharingCapability specified', async () => {
    const sharingCapabilityvalue = 'nonExistentSharingCapabilityValue';
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', sharingCapability: sharingCapabilityvalue } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if correct sharingCapability specified', async () => {
    const sharingCapabilityvalue = 'ExternalUserSharingOnly';
    const actual = await command.validate({ options: { url: 'https://contoso.sharepoint.com', sharingCapability: sharingCapabilityvalue } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('updates title of the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site title. doesn\'t wait for completion (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title' } });
    assert(loggerLogToStderrSpy.called);
  });

  it('updates site title. wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site title. wait for completion (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } });
    assert(loggerLogToStderrSpy.called);
  });

  it('updates site title. wait for completion (verbose)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { verbose: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } });
    assert(loggerLogToStderrSpy.called);
  });

  it('updates title of the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso-admin.sharepoint.com/_api/SPOGroup/UpdateGroupPropertiesBySiteId' &&
        JSON.stringify(opts.data) === JSON.stringify({
          groupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e',
          siteId: '255a50b2-527f-4413-8485-57f4c17a24d1',
          displayName: 'New title'
        })) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('updates site description.', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`https://contoso.sharepoint.com/sites/team/_api/web`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.headers['X-HTTP-Method'] === 'MERGE' &&
          JSON.stringify(opts.data) === JSON.stringify({ Description: 'New description' })) {
          return;
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', description: 'New description' } });
  });

  it('updates isPublic property of the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    const executeSetGroupSpy = await sinon.stub(entraGroup, 'setGroup').resolves();
    sinon.stub(request, 'patch').callsFake(async (opts) => {
      if (opts.url === 'https://graph.microsoft.com/v1.0/groups/e10a459e-60c8-4000-8240-a68d6a12d39e') {
        return;
      }

      throw 'Invalid request';
    });
    await command.action(logger, { options: { isPublic: true, description: 'Some description', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
    assert(executeSetGroupSpy.called);
  });

  it('updates site lockState. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site lockState. doesn\'t wait for completion (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } });
    assert(loggerLogToStderrSpy.called);
  });

  it('updates site lockState. wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site lockState. wait for completion. error while polling', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "An error has occurred.", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "SPException"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]);
        }
      }

      throw 'Invalid request';
    });
    waitUntilFinishedStub.restore();
    sinon.stub(spo, 'waitUntilFinished').rejects(new Error("An error has occurred."));

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } } as any),
      new CommandError('An error has occurred.'));
  });

  it('updates site lockState. wait for completion two rounds', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // not done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }

        // done
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site lockState. wait for completion, immediate complete', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates all properties. wait for completion, immediately complete', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><SetProperty Id="28" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="29" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="30" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="31" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="32" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><SetProperty Id="33" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">0</Parameter></SetProperty><SetProperty Id="34" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }

        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]);
        }

        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', sharingCapability: 'Disabled', resourceQuota: 100, resourceQuotaWarningLevel: 100, storageQuota: 100, storageQuotaWarningLevel: 100, allowSelfServiceUpgrade: true, noScriptSite: true, owners: 'admin@contoso.com', lockState: 'NoAccess', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site sharing mode. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', sharing: 'Disabled' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site resourceQuota. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', resourceQuota: 100 } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site resourceQuotaWarningLevel. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', resourceQuotaWarningLevel: 100 } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site storageQuota. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', storageQuota: 100 } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site storageQuotaWarningLevel. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', storageQuotaWarningLevel: 100 } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site allowSelfServiceUpgrade. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site noScriptSite to true. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site noScriptSite to false. doesn\'t wait for completion', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">1</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: false } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates site title. waits for completion, immediately complete', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates the classification of the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url === 'https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery') &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { classification: 'HBI', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates the classification of the specified site (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, classification: 'HBI', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogToStderrSpy.calledWith('Site is not group connected'));
  });

  it('updates the classification of the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url === 'https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery') &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { classification: 'HBI', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates the classification of the specified groupified site (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url === 'https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery') &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, classification: 'HBI', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogToStderrSpy.calledWith(`Site attached to group e10a459e-60c8-4000-8240-a68d6a12d39e`));
  });

  it('updates owners of the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/Sales</Parameter><Parameter Type="String">admin@contoso.onmicrosoft.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates owners of the specified site (verbose)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/Sales</Parameter><Parameter Type="String">admin@contoso.onmicrosoft.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { verbose: true, owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('updates owners of the specified groupified site with one owner', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('updates owners of the specified groupified site with one owner (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogToStderrSpy.calledWith('Retrieving user information to set group owners...'));
  });

  it('updates owners of the specified groupified site with multiple owners', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' },
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return;
      }
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('updates owners of the specified groupified site with multiple owners with extra spaces', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' },
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return;
      }
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: ' admin1@contoso.onmicrosoft.com , admin2@contoso.onmicrosoft.com ', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('resets the classification of the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url === 'https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery') &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String"></Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { classification: '', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('resets the classification of the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url === 'https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery') &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String"></Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { classification: '', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets disableFlows to true for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Enum">1</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { disableFlows: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets disableFlows to true for the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Enum">1</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { disableFlows: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets disableFlows to false for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { disableFlows: false, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets socialBarOnSitePagesDisabled to true for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="SocialBarOnSitePagesDisabled"><Parameter Type="Boolean">true</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { socialBarOnSitePagesDisabled: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets socialBarOnSitePagesDisabled to true for the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="SocialBarOnSitePagesDisabled"><Parameter Type="Boolean">true</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { socialBarOnSitePagesDisabled: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets socialBarOnSitePagesDisabled to false for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="SocialBarOnSitePagesDisabled"><Parameter Type="Boolean">false</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { socialBarOnSitePagesDisabled: false, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets shareByEmailEnabled to true for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { shareByEmailEnabled: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets shareByEmailEnabled to true for the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { shareByEmailEnabled: true, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets shareByEmailEnabled to false for the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">false</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { shareByEmailEnabled: false, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets shareByEmailEnabled to false for the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">false</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { shareByEmailEnabled: false, url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets sharingCapabilities for Site - Disabled', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }
      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_vti_bin/client.svc/ProcessQuery`) {
        return JSON.stringify(
          [
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8929.1227", "ErrorInfo": null, "TraceCorrelationId": "e4f2e59e-c0a9-0000-3dd0-1d8ef12cc742"
            },
            2,
            {
              "IsNull": false
            },
            4,
            {
              "IsNull": false
            },
            7,
            {
              "IsNull": false
            },
            8,
            {
              "_ObjectIdentity_": "b61d6a9f-d0ca-0000-4814-29cf3242c81a|908bed80-a04a-4433-b4a0-883d9847d110:095efa67-57fa-40c7-b7cc-e96dc3e5780c\nSiteProperties\nhttps%3a%2f%contoso.sharepoint.com%2fsites%2fSales"
            }
          ]
        );
      }
      throw 'Invalid request';
    });
    await command.action(logger, { options: { sharingCapability: 'Disabled', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogSpy.notCalled);
  });

  it('sets sharingCapabilities for Site - (Debug) -  Disabled', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }
      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">0</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
        return JSON.stringify(
          [
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.8929.1227", "ErrorInfo": null, "TraceCorrelationId": "e4f2e59e-c0a9-0000-3dd0-1d8ef12cc742"
            },
            2,
            {
              "IsNull": false
            },
            4,
            {
              "IsNull": false
            },
            7,
            {
              "IsNull": false
            },
            8,
            {
              "_ObjectIdentity_": "b61d6a9f-d0ca-0000-4814-29cf3242c81a|908bed80-a04a-4433-b4a0-883d9847d110:095efa67-57fa-40c7-b7cc-e96dc3e5780c\nSiteProperties\nhttps%3a%2f%contoso.sharepoint.com%2fsites%2fSales"
            }
          ]
        );
      }
      throw 'Invalid request';
    });
    await command.action(logger, { options: { debug: true, sharingCapability: 'Disabled', url: 'https://contoso.sharepoint.com/sites/Sales' } });
    assert(loggerLogToStderrSpy.called);
  });

  it('throws error when trying to update isPublic property on a non-groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { isPublic: true, url: 'https://contoso.sharepoint.com/sites/Sales' } } as any),
      new CommandError(`The isPublic option can't be set on a site that is not groupified`));
  });

  it('correctly handles error when updating title of the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2FSales" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any),
      new CommandError('Unknown Error'));
  });

  it('correctly handles error while updating isPublic property of the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(entraGroup, 'setGroup').rejects(new Error('An error has occurred'));

    await assert.rejects(command.action(logger, { options: { isPublic: true, url: 'https://contoso.sharepoint.com/sites/Sales' } } as any),
      new CommandError('An error has occurred'));
  });

  it('skips users that could not be resolves when setting groupified site owners', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' }
          ]
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('fails silently if could not resolve users when setting groupified site owners', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return {
          value: []
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any);
  });

  it('applies site design to the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    const executeApplySiteDesignSpy = await sinon.stub(spo, 'applySiteDesign').resolves();

    await command.action(logger, { options: { siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } });

    assert(executeApplySiteDesignSpy.called);
  });

  it('applies site design to the specified groupified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    const executeApplySiteDesignSpy = sinon.stub(spo, 'applySiteDesign').resolves();

    await command.action(logger, { options: { siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } });

    assert(executeApplySiteDesignSpy.called);
  });

  it('applies site relative logo url to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: "/sites/logo/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/logo/SiteAssets/parker-ms-1200.png");
  });

  it('applies site relative logo url from another site to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: "/sites/another_site/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/another_site/SiteAssets/parker-ms-1200.png");
  });

  it('applies site absolute logo url to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: "https://contoso.sharepoint.com/sites/logo/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/logo/SiteAssets/parker-ms-1200.png");
  });

  it('applies site absolute logo url from another site to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: "https://contoso.sharepoint.com/sites/another_site/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/another_site/SiteAssets/parker-ms-1200.png");
  });

  it('correctly handles unsetting the logo from the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/logo', siteLogoUrl: "" } });
    assert.strictEqual(data.relativeLogoUrl, "");
  });

  it('applies site relative thumbnail url to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: "/sites/logo/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/logo/SiteAssets/parker-ms-1200.png");
  });

  it('applies site relative thumbnail url from another site to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: "/sites/another_site/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/another_site/SiteAssets/parker-ms-1200.png");
  });

  it('applies site absolute thumbnail url to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: "https://contoso.sharepoint.com/sites/logo/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/logo/SiteAssets/parker-ms-1200.png");
  });

  it('applies site absolute thumbnail url from another site to the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: "https://contoso.sharepoint.com/sites/another_site/SiteAssets/parker-ms-1200.png" } });
    assert.strictEqual(data.relativeLogoUrl, "/sites/another_site/SiteAssets/parker-ms-1200.png");
  });

  it('correctly handles unsetting the thumbnail from the specified site', async () => {
    let data: any = {};

    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/logo/_api/siteiconmanager/setsitelogo') {
        data = opts.data;
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, url: 'https://contoso.sharepoint.com/sites/logo', siteThumbnailUrl: "" } });
    assert.strictEqual(data.relativeLogoUrl, "");
  });


  it('correctly handles error when applying site design to the specified site', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(spo, 'applySiteDesign').rejects(new Error('An error has occurred'));

    await assert.rejects(command.action(logger, { options: { siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } } as any),
      new CommandError('An error has occurred'));
  });

  it('correctly handles site not found error', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        throw new Error("404 - \"404 FILE NOT FOUND\"");
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/Sales', classification: 'HBI' } } as any), new CommandError("404 - \"404 FILE NOT FOUND\""));
  });

  it('correctly handles API error while updating shared properties', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7303.1206", "ErrorInfo": {
              "ErrorMessage": "An error has occurred.", "ErrorValue": null, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799", "ErrorCode": -2146232832, "ErrorTypeName": "Microsoft.SharePoint.SPException"
            }, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/Sales', classification: 'HBI' } } as any),
      new CommandError("An error has occurred."));
  });

  it('correctly handles API error while updating sharingCapability properties', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        return JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7303.1206", "ErrorInfo": {
              "ErrorMessage": "An error has occurred.", "ErrorValue": null, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799", "ErrorCode": -2146232832, "ErrorTypeName": "Microsoft.SharePoint.SPException"
            }, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799"
          }
        ]);
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/Sales', sharingCapability: 'Invalid' } } as any),
      new CommandError("An error has occurred."));
  });

  it('correctly handles Generic API error', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        throw 'An error has occurred';
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/Sales', sharingCapability: 'Disabled' } } as any),
      new CommandError('An error has occurred'));
  });

  it('configures command types', () => {
    assert.notStrictEqual(typeof command.types, 'undefined', 'command types undefined');
    assert.notStrictEqual(command.types.string, 'undefined', 'command string types undefined');
  });

  it('configures classification as string option', () => {
    const types = command.types;
    ['classification'].forEach(o => {
      assert.notStrictEqual((types.string as string[]).indexOf(o), -1, `option ${o} not specified as string`);
    });
  });

  it('supports specifying site url', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--url') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying site classification', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--classification') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying disableFlows', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--disableFlows') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying socialBarOnSitePagesDisabled', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--socialBarOnSitePagesDisabled') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying site logo', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--siteLogoUrl') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('handles error while adding site admin', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } } as any),
      new CommandError('Unknown Error'));
  });

  it('handles generic error while adding site admin', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          throw 'Unknown Error';
        }
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } } as any),
      new CommandError('Unknown Error'));
  });

  it('handles error while updating site lockState', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'ABC' &&
          opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } } as any),
      new CommandError('Unknown Error'));
  });

  it('escapes XML in the request', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/team/_api/site?$select=GroupId,Id') {
        return {
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Title"><Parameter Type="String">New title&gt;</Parameter></SetProperty><SetProperty Id="28" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="29" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="30" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="31" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="32" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><SetProperty Id="33" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }

        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com&gt;</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]);
        }

        if (opts.data === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 0
            }
          ]);
        }
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { url: 'https://contoso.sharepoint.com/sites/team', title: 'New title>', sharing: 'Disabled', resourceQuota: 100, resourceQuotaWarningLevel: 100, storageQuota: 100, storageQuotaWarningLevel: 100, allowSelfServiceUpgrade: true, noScriptSite: true, owners: 'admin@contoso.com>', lockState: 'NoAccess', wait: true } });
    assert(loggerLogSpy.notCalled);
  });
});