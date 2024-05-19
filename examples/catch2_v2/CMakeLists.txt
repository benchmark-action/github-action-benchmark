cmake_minimum_required(VERSION 3.12)
project("Catch2_bench")

include(FetchContent)

FetchContent_Declare(
  catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v2.11.0)

FetchContent_GetProperties(catch2)
if(NOT catch2_POPULATED)
  FetchContent_Populate(catch2)
  add_subdirectory(${catch2_SOURCE_DIR} ${catch2_BINARY_DIR})
endif()

add_executable(${PROJECT_NAME})
target_sources(${PROJECT_NAME} PRIVATE catch2_bench.cpp)
target_link_libraries(${PROJECT_NAME} Catch2::Catch2)

target_compile_options(
  ${PROJECT_NAME}
  PRIVATE
    $<$<CXX_COMPILER_ID:MSVC>:/DCATCH_CONFIG_ENABLE_BENCHMARKING>
    $<$<OR:$<CXX_COMPILER_ID:GNU>,$<CXX_COMPILER_ID:Clang>,$<CXX_COMPILER_ID:AppleClang>>:-DCATCH_CONFIG_ENABLE_BENCHMARKING>
)
