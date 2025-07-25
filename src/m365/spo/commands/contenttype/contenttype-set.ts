import { Logger } from '../../../../cli/Logger.js';
import config from '../../../../config.js';
import GlobalOptions from '../../../../GlobalOptions.js';
import request, { CliRequestOptions } from '../../../../request.js';
import { formatting } from '../../../../utils/formatting.js';
import { ClientSvcResponse, ClientSvcResponseContents, spo } from '../../../../utils/spo.js';
import { urlUtil } from '../../../../utils/urlUtil.js';
import { validation } from '../../../../utils/validation.js';
import SpoCommand from '../../../base/SpoCommand.js';
import commands from '../../commands.js';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  id?: string;
  name?: string;
  listTitle?: string;
  listId: string;
  listUrl: string;
  updateChildren: boolean;
}

class SpoContentTypeSetCommand extends SpoCommand {
  public get name(): string {
    return commands.CONTENTTYPE_SET;
  }

  public get description(): string {
    return 'Update an existing content type';
  }

  constructor() {
    super();

    this.#initTelemetry();
    this.#initOptions();
    this.#initTypes();
    this.#initOptionSets();
    this.#initValidators();
  }

  #initTelemetry(): void {
    this.telemetry.push((args: CommandArgs) => {
      Object.assign(this.telemetryProperties, {
        id: typeof args.options.id !== 'undefined',
        name: typeof args.options.name !== 'undefined',
        listTitle: typeof args.options.listTitle !== 'undefined',
        listId: typeof args.options.listId !== 'undefined',
        listUrl: typeof args.options.listUrl !== 'undefined',
        updateChildren: args.options.updateChildren
      });
    });
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '-u, --webUrl <webUrl>'
      },
      {
        option: '-i, --id [id]'
      },
      {
        option: '-n, --name [name]'
      },
      {
        option: '--listTitle [listTitle]'
      },
      {
        option: '--listId [listId]'
      },
      {
        option: '--listUrl [listUrl]'
      },
      {
        option: '--updateChildren'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        const isValidSharePointUrl: boolean | string = validation.isValidSharePointUrl(args.options.webUrl);
        if (isValidSharePointUrl !== true) {
          return isValidSharePointUrl;
        }

        if (args.options.listId && !validation.isValidGuid(args.options.listId)) {
          return `'${args.options.listId}' is not a valid GUID.`;
        }

        if ((args.options.listId && (args.options.listTitle || args.options.listUrl)) || (args.options.listTitle && args.options.listUrl)) {
          return `Specify either listTitle, listId or listUrl.`;
        }

        if ((args.options.listId || args.options.listTitle || args.options.listUrl) && args.options.updateChildren) {
          return 'It is impossible to pass updateChildren when trying to update a list content type.';
        }

        return true;
      }
    );
  }

  #initTypes(): void {
    this.types.string.push('id', 'i');
  }

  #initOptionSets(): void {
    this.optionSets.push(
      { options: ['id', 'name'] }
    );
  }

  public allowUnknownOptions(): boolean | undefined {
    return true;
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      const contentTypeId = await this.getContentTypeId(logger, args.options);
      const siteId = await spo.getSiteIdBySPApi(args.options.webUrl, logger, this.verbose);
      const webId = await spo.getWebId(args.options.webUrl, logger, this.verbose);
      await this.updateContentType(logger, siteId, webId, contentTypeId, args.options);
    }
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }

  private async getContentTypeId(logger: Logger, options: Options): Promise<string> {
    if (options.id) {
      return options.id;
    }

    if (this.verbose) {
      await logger.logToStderr(`Retrieving content type to update...`);
    }

    const requestOptions: CliRequestOptions = {
      url: `${options.webUrl}/_api/Web`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      responseType: 'json'
    };

    if (options.listId) {
      requestOptions.url += `/Lists/GetById('${formatting.encodeQueryParameter(options.listId)}')`;
    }
    else if (options.listTitle) {
      requestOptions.url += `/Lists/GetByTitle('${formatting.encodeQueryParameter(options.listTitle)}')`;
    }
    else if (options.listUrl) {
      requestOptions.url += `/GetList('${formatting.encodeQueryParameter(urlUtil.getServerRelativePath(options.webUrl, options.listUrl))}')`;
    }
    requestOptions.url += `/ContentTypes?$filter=Name eq '${formatting.encodeQueryParameter(options.name!)}'&$select=Id`;

    const res = await request.get<{ value: { Id: { StringValue: string } }[] }>(requestOptions);

    if (res.value.length === 0) {
      throw `The specified content type '${options.name}' does not exist`;
    }

    return res.value[0].Id.StringValue;
  }

  private async updateContentType(logger: Logger, siteId: string, webId: string, contentTypeId: string, options: Options): Promise<void> {
    if (this.verbose) {
      await logger.logToStderr(`Updating content type...`);
    }

    const requestOptions: CliRequestOptions = {
      url: `${options.webUrl}/_vti_bin/client.svc/ProcessQuery`,
      headers: {
        'Content-Type': 'text/xml'
      },
      data: await this.getCsomCallXmlBody(options, siteId, webId, contentTypeId, logger)
    };

    const res = await request.post<string>(requestOptions);
    const json: ClientSvcResponse = JSON.parse(res);
    const response: ClientSvcResponseContents = json[0];
    if (response.ErrorInfo) {
      throw response.ErrorInfo.ErrorMessage;
    }
  }

  private async getCsomCallXmlBody(options: Options, siteId: string, webId: string, contentTypeId: string, logger: Logger): Promise<string> {
    const payload = this.getRequestPayload(options);
    const list = await this.getListId(options, logger);
    return `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions>${payload}</Actions><ObjectPaths><Identity Id="9" Name="fc4179a0-e0d7-5000-c38b-bc3506fbab6f|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:${siteId}:web:${webId}${list}:contenttype:${formatting.escapeXml(contentTypeId)}" /></ObjectPaths></Request>`;
  }

  private getRequestPayload(options: Options): string {
    const excludeOptions: string[] = [
      'webUrl',
      'id',
      'name',
      'listTitle',
      'listId',
      'listUrl',
      'query',
      'debug',
      'verbose',
      'output',
      'updateChildren'
    ];

    let i: number = 12;
    const payload: string[] = Object.keys(options)
      .filter(key => excludeOptions.indexOf(key) === -1)
      .map(key => {
        return `<SetProperty Id="${i++}" ObjectPathId="9" Name="${key}"><Parameter Type="String">${formatting.escapeXml(options[key])}</Parameter></SetProperty>`;
      });

    if (options.updateChildren) {
      payload.push(`<Method Name="Update" Id="${i++}" ObjectPathId="9"><Parameters><Parameter Type="Boolean">true</Parameter></Parameters></Method>`);
    }
    else {
      payload.push(`<Method Name="Update" Id="${i++}" ObjectPathId="9"><Parameters><Parameter Type="Boolean">false</Parameter></Parameters></Method>`);
    }

    return payload.join('');
  }

  private async getListId(options: Options, logger: Logger): Promise<string> {
    if (!options.listId && !options.listTitle && !options.listUrl) {
      return '';
    }
    let baseString = ':list:';
    if (options.listId) {
      return baseString += options.listId;
    }
    return baseString += await spo.getListId(options.webUrl, options.listTitle, options.listUrl, logger, this.verbose);
  }
}

export default new SpoContentTypeSetCommand();