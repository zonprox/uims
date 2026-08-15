import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SearchQueryDto } from '@uims/shared-types';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global full-text search across assets, licenses, and directory',
  })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync database records to Meilisearch search indices' })
  sync() {
    return this.searchService.syncAllToMeilisearch();
  }
}
