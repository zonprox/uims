import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SearchQueryDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across resources' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Post('sync')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Synchronize search index' })
  sync() {
    return this.searchService.syncAllToMeilisearch();
  }
}
