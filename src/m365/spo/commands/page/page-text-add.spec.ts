import assert from 'assert';
import sinon from 'sinon';
import auth from '../../../../Auth.js';
import { cli } from '../../../../cli/cli.js';
import { CommandInfo } from '../../../../cli/CommandInfo.js';
import { Logger } from '../../../../cli/Logger.js';
import { CommandError } from '../../../../Command.js';
import request from '../../../../request.js';
import { telemetry } from '../../../../telemetry.js';
import { pid } from '../../../../utils/pid.js';
import { session } from '../../../../utils/session.js';
import { sinonUtil } from '../../../../utils/sinonUtil.js';
import { spo } from '../../../../utils/spo.js';
import commands from '../../commands.js';
import command from './page-text-add.js';
import { mockBackgroundControlHTML, mockEmptyPage, mockFullWidthSectionHTML, mockOneColumnSectionHTML, mockPageSettingsHTML, mockThreeColumnSectionHTML, mockTwoColumnLeftSectionHTML, mockTwoColumnRightSectionHTML, mockTwoColumnsSectionHTML, mockVerticalSectionHTML } from './page.mock.js';

describe(commands.PAGE_TEXT_ADD, () => {
  let log: string[];
  let logger: Logger;
  let commandInfo: CommandInfo;
  let loggerLogToStderrSpy: sinon.SinonSpy;

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
    loggerLogToStderrSpy = sinon.spy(logger, 'logToStderr');
  });

  afterEach(() => {
    sinonUtil.restore([
      request.post,
      request.get
    ]);
  });

  after(() => {
    sinon.restore();
    auth.connection.active = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name.startsWith(commands.PAGE_TEXT_ADD), true);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('adds text to an empty modern page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: mockEmptyPage,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to an empty modern page (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1: mockEmptyPage,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'page.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          debug: true,
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });
    assert(loggerLogToStderrSpy.called);
  });

  it('adds text to an empty modern page on root of tenant (debug)', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/_api/web/GetFileByServerRelativePath(DecodedUrl='/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1: mockEmptyPage,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'page.aspx',
          ServerRelativeUrl: '/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/_api/web/GetFileByServerRelativePath(DecodedUrl='/sitepages/page.aspx')/ListItemAllFields`) {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          debug: true,
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com',
          text: 'Hello world'
        }
      });
    assert(loggerLogToStderrSpy.called);
  });

  it('appends text to a modern page which already had some text', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url ===
        `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`
      ) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML(1, false, false, true)}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;2,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${mockOneColumnSectionHTML(1, false, false, true)}${newPart}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text in the specified order to a modern page which already had some text', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url ===
        `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`
      ) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML(1, false, false, true)}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world 1.1',
          order: 2
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;2,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world 1.1</p></div></div>';

    const regex = new RegExp(`<div>${mockOneColumnSectionHTML(1, false, false, true)}${newPart}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page without specifying the page file extension', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url ===
        `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: mockEmptyPage,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page with existing empty collapsable section and page settings control', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url ===
        `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML(1, false, true)}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;,&quot;zoneGroupMetadata&quot;&#58;&#123;&quot;type&quot;&#58;1,&quot;isExpanded&quot;&#58;true,&quot;showDividerLine&quot;&#58;false,&quot;iconAlignment&quot;&#58;&quot;left&quot;,&quot;headingLevel&quot;&#58;2,&quot;displayName&quot;&#58;&quot;Test&quot;&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page with existing collapsable section with existing text webpart', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML(1, false, true)}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;,&quot;zoneGroupMetadata&quot;&#58;&#123;&quot;type&quot;&#58;1,&quot;isExpanded&quot;&#58;true,&quot;showDividerLine&quot;&#58;false,&quot;iconAlignment&quot;&#58;&quot;left&quot;,&quot;headingLevel&quot;&#58;2,&quot;displayName&quot;&#58;&quot;Test&quot;&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page with background setting and existing text webpart', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML(1)}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockOneColumnSectionHTML(2, false, false, true)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page on specific section and column with background setting and existing text webpart', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockTwoColumnsSectionHTML(1, false, false, true)}${mockOneColumnSectionHTML(2)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1,
          column: 2
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;2,&quot;sectionFactor&quot;&#58;6,&quot;sectionIndex&quot;&#58;2,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${mockTwoColumnsSectionHTML(1, false, false, true)}${newPart}${mockOneColumnSectionHTML(2)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page on specific section and column with background setting, collapsible section and existing text webpart', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockTwoColumnsSectionHTML(1, false, true, true)}${mockOneColumnSectionHTML(2)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1,
          column: 2
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;2,&quot;sectionFactor&quot;&#58;6,&quot;sectionIndex&quot;&#58;2,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;,&quot;zoneGroupMetadata&quot;&#58;&#123;&quot;type&quot;&#58;1,&quot;isExpanded&quot;&#58;true,&quot;showDividerLine&quot;&#58;false,&quot;iconAlignment&quot;&#58;&quot;left&quot;,&quot;headingLevel&quot;&#58;2,&quot;displayName&quot;&#58;&quot;Test&quot;&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${mockTwoColumnsSectionHTML(1, false, true, true)}${newPart}${mockOneColumnSectionHTML(2)}${mockPageSettingsHTML}${mockBackgroundControlHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page and vertical section preserved on the page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockVerticalSectionHTML()}${mockOneColumnSectionHTML(2)}}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 2
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;2,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${mockVerticalSectionHTML()}${newPart}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page and section with standard emphasis preserved on the page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML()}${mockFullWidthSectionHTML(2, true)}}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockFullWidthSectionHTML(2, true)}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('adds text to a modern page and all section types are preserved on the page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Home.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Home',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Home',
            CanvasContent1: `<div>${mockOneColumnSectionHTML()}${mockTwoColumnsSectionHTML(2)}${mockThreeColumnSectionHTML(3)}${mockTwoColumnLeftSectionHTML(4)}${mockTwoColumnRightSectionHTML(5)}${mockOneColumnSectionHTML(6)}${mockPageSettingsHTML}</div>`,
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/home.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    const postStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if (opts.url === "https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/sitepages/page.aspx')/ListItemAllFields") {
        return;
      }

      throw 'Invalid request';
    });

    await command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1
        }
      });

    const newPart = '<div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;4,&quot;editorType&quot;&#58;&quot;CKEditor&quot;,&quot;id&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;position&quot;&#58;&#123;&quot;controlIndex&quot;&#58;1,&quot;sectionFactor&quot;&#58;12,&quot;sectionIndex&quot;&#58;1,&quot;zoneIndex&quot;&#58;1,&quot;zoneId&quot;&#58;&quot;([0-9a-fA-F-]{36})&quot;,&quot;layoutIndex&quot;&#58;1&#125;&#125;"><div data-sp-rte=""><p>Hello world</p></div></div>';

    const regex = new RegExp(`<div>${newPart}${mockTwoColumnsSectionHTML(2)}${mockThreeColumnSectionHTML(3)}${mockTwoColumnLeftSectionHTML(4)}${mockTwoColumnRightSectionHTML(5)}${mockOneColumnSectionHTML(6)}${mockPageSettingsHTML}</div>`);
    assert.match(postStub.lastCall.args[0].data.CanvasContent1, regex);
  });

  it('correctly handles OData error when adding text to a non-existing page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/foo.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        throw { error: { 'odata.error': { message: { value: 'The file /sites/team-a/SitePages/foo.aspx does not exist' } } } };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'foo.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      }), new CommandError('The file /sites/team-a/SitePages/foo.aspx does not exist'));
  });

  it('correctly handles OData error when adding text to a page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'page.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1:
              '<div><div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;0,&quot;pageSettingsSlice&quot;&#58;&#123;&quot;isDefaultDescription&quot;&#58;true,&quot;isDefaultThumbnail&quot;&#58;true&#125;&#125;"></div></div>',
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    sinon.stub(request, 'post').callsFake(() => {
      throw { error: { 'odata.error': { message: { value: 'An error has occurred' } } } };
    });

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      }), new CommandError('An error has occurred'));
  });

  it('correctly handles error if target page is not a modern page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'Page.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world'
        }
      }), new CommandError(`Page page.aspx is not a modern page.`));
  });

  it('correctly handles invalid section error when adding text to modern page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'page.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1:
              '<div><div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;0,&quot;pageSettingsSlice&quot;&#58;&#123;&quot;isDefaultDescription&quot;&#58;true,&quot;isDefaultThumbnail&quot;&#58;true&#125;&#125;"></div></div>',
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 8
        }
      }), new CommandError("Invalid section '8'"));
  });

  it('correctly handles invalid column error when adding text to modern page', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'page.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1:
              '<div><div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&quot;&#58;0,&quot;pageSettingsSlice&quot;&#58;&#123;&quot;isDefaultDescription&quot;&#58;true,&quot;isDefaultThumbnail&quot;&#58;true&#125;&#125;"></div></div>',
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1,
          column: 7
        }
      }), new CommandError("Invalid column '7'"));
  });

  it('correctly handles error when parsing modern page contents', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/team-a/_api/web/GetFileByServerRelativePath(DecodedUrl='/sites/team-a/SitePages/page.aspx')?$expand=ListItemAllFields/ClientSideApplicationId`) {
        return {
          ListItemAllFields: {
            CommentsDisabled: false,
            FileSystemObjectType: 0,
            Id: 1,
            ServerRedirectedEmbedUri: null,
            ServerRedirectedEmbedUrl: '',
            ContentTypeId: '0x0101009D1CB255DA76424F860D91F20E6C41180062FDF2882AB3F745ACB63105A3C623C9',
            FileLeafRef: 'page.aspx',
            ComplianceAssetId: null,
            WikiField: null,
            Title: 'Page',
            ClientSideApplicationId: 'b6917cb1-93a0-4b97-a84d-7cf49975d4ec',
            PageLayoutType: 'Article',
            CanvasContent1:
              '<div><div data-sp-canvascontrol="" data-sp-canvasdataversion="1.0" data-sp-controldata="&#123;&quot;controlType&qu"></div></div>',
            BannerImageUrl: {
              Description: '/_layouts/15/images/sitepagethumbnail.png',
              Url: 'https://contoso.sharepoint.com/_layouts/15/images/sitepagethumbnail.png'
            },
            Description: 'Lorem ipsum Dolor samet Lorem ipsum',
            PromotedState: null,
            FirstPublishedDate: null,
            LayoutWebpartsContent: null,
            AuthorsId: null,
            AuthorsStringId: null,
            OriginalSourceUrl: null,
            ID: 1,
            Created: '2018-01-20T09:54:41',
            AuthorId: 1073741823,
            Modified: '2018-04-12T12:42:47',
            EditorId: 12,
            OData__CopySource: null,
            CheckoutUserId: null,
            OData__UIVersionString: '7.0',
            GUID: 'edaab907-e729-48dd-9e73-26487c0cf592'
          },
          CheckInComment: '',
          CheckOutType: 2,
          ContentTag: '{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25,1',
          CustomizedPageStatus: 1,
          ETag: '"{E82A21D1-CA2C-4854-98F2-012AC0E7FA09},25"',
          Exists: true,
          IrmEnabled: false,
          Length: '805',
          Level: 1,
          LinkingUri: null,
          LinkingUrl: '',
          MajorVersion: 7,
          MinorVersion: 0,
          Name: 'home.aspx',
          ServerRelativeUrl: '/sites/team-a/SitePages/page.aspx',
          TimeCreated: '2018-01-20T08:54:41Z',
          TimeLastModified: '2018-04-12T10:42:46Z',
          Title: 'Home',
          UIVersion: 3584,
          UIVersionLabel: '7.0',
          UniqueId: 'e82a21d1-ca2c-4854-98f2-012ac0e7fa09'
        };
      }

      throw 'Invalid request';
    });

    let errorMessage;
    try {
      JSON.parse('{"controlType&qu');
    }
    catch (err: any) {
      errorMessage = err.message;
    }

    await assert.rejects(command.action(logger,
      {
        options: {
          pageName: 'page.aspx',
          webUrl: 'https://contoso.sharepoint.com/sites/team-a',
          text: 'Hello world',
          section: 1,
          column: 1
        }
      }), new CommandError(errorMessage));
  });

  it('supports verbose mode', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option === '--verbose') {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying page name', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option.indexOf('--pageName') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying webUrl', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option.indexOf('--webUrl') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying section', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option.indexOf('--section') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying column', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option.indexOf('--column') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying order', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach((o) => {
      if (o.option.indexOf('--order') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('fails validation if webUrl is not an absolute URL', async () => {
    const actual = await command.validate({
      options: { pageName: 'page.aspx', webUrl: 'foo', text: 'Hello world' }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if webUrl is not a valid SharePoint URL', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'http://foo',
        text: 'Hello world'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation when name and webUrl specified, webUrl is a valid SharePoint URL and text is specified', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation when name has no extension', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('fails validation if section has invalid (negative) value', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world',
        section: -1
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if section has invalid (non number) value', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world',
        section: 'foobar'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if column has invalid (negative) value', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world',
        column: -1
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if column has invalid (non number) value', async () => {
    const actual = await command.validate({
      options: {
        pageName: 'page.aspx',
        webUrl: 'https://contoso.sharepoint.com',
        text: 'Hello world',
        column: 'foobar'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });
});
